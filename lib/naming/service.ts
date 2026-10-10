import type { SupabaseClient } from "@supabase/supabase-js";

import { analyzeSaju } from "@/lib/saju";
import { analyzeName } from "./analyze";
import { fetchByEum, fetchPool, fetchSurname } from "./hanja-repo";
import type { NamingParams } from "./params";
import { recommendNames, type NameHanja, type Recommendation } from "./recommend";

export type NamingResult =
  | {
      ok: true;
      saju: ReturnType<typeof analyzeSaju>;
      surname: NameHanja[];
      recommendations: Recommendation[];
    }
  | { ok: false; error: string };

/** 성씨 한자 + 사주 계산. 추천/저장에서 공통으로 사용 */
export async function prepare(supabase: SupabaseClient, p: NamingParams) {
  const surname = await fetchSurname(supabase, [...p.surnameHanja], [...p.surname]);
  if (!surname) return null;
  return { surname, saju: analyzeSaju(p.birth) };
}

export async function runNaming(
  supabase: SupabaseClient,
  p: NamingParams
): Promise<NamingResult> {
  try {
    return await runNamingUnsafe(supabase, p);
  } catch (e) {
    console.error("[naming] 추천 실패", e);
    return {
      ok: false,
      error:
        "한자 사전을 불러오지 못했습니다. 데이터베이스에 스키마와 한자 시드(supabase/seed)가 적용되었는지 확인해 주세요.",
    };
  }
}

async function runNamingUnsafe(
  supabase: SupabaseClient,
  p: NamingParams
): Promise<NamingResult> {
  const base = await prepare(supabase, p);
  if (!base) {
    return {
      ok: false,
      error: `'${p.surname}' 성에 해당하는 한자 ${p.surnameHanja}을(를) 사전에서 찾을 수 없습니다.`,
    };
  }
  const { surname, saju } = base;
  const needed = saju.yongsin.yongsin;

  // 희귀 한자까지 쌍으로 전수 평가하면 너무 느리므로, 교육용 한자 밖의 글자는
  // 용신 오행이 확인된 것만 후보에 넣는다.
  const fullPool = await fetchPool(supabase, p.includeRare);
  const pool = p.includeRare
    ? fullPool.filter((c) => c.edu || c.element === needed)
    : fullPool;
  let first = pool;
  let second = pool;
  if (p.dolrimja) {
    const fixed = await fetchByEum(supabase, p.dolrimja.syllable, p.includeRare);
    if (fixed.length === 0) {
      return { ok: false, error: `돌림자 '${p.dolrimja.syllable}'에 해당하는 한자가 없습니다.` };
    }
    if (p.dolrimja.position === 1) first = fixed;
    else second = fixed;
  }

  const run = (minLuckyGyeok: number) =>
    recommendNames({
      surname,
      first: p.length === "1" ? [] : first,
      second: p.length === "1" ? [] : second,
      single: p.length === "2" || p.dolrimja ? [] : pool,
      neededElement: needed,
      requireNeeded: true,
      minLuckyGyeok,
      minGlobalScore: p.globalFriendly ? 70 : 0,
      limit: 30,
    });

  // 4격이 모두 길수인 이름을 우선하고, 후보가 부족하면 3격 이상으로 완화한다
  let recommendations = run(4);
  // (희귀 한자 포함 모드는 후보가 많아 느리므로 완화 재시도를 하지 않는다)
  if (recommendations.length < 10 && !p.includeRare) recommendations = run(3);

  return { ok: true, saju, surname, recommendations };
}

/** 저장 시 서버에서 다시 분석 (클라이언트가 보낸 점수를 신뢰하지 않음) */
export async function analyzeChosen(
  supabase: SupabaseClient,
  p: NamingParams,
  givenHanja: string,
  givenEum: string
) {
  const base = await prepare(supabase, p);
  if (!base) return null;
  const given = await fetchSurname(supabase, [...givenHanja], [...givenEum]);
  if (!given) return null;
  const analysis = analyzeName({
    surname: base.surname,
    givenName: given,
    neededElement: base.saju.yongsin.yongsin,
  });
  return { ...base, given, analysis };
}
