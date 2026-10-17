import type { SupabaseClient } from "@supabase/supabase-js";

import { analyzeSaju } from "@/lib/saju";
import { loadNameSummaries, type NameStatSummary } from "@/lib/stats/name-stats";
import { analyzeName } from "./analyze";
import { fetchByEum, fetchPool, fetchSurname } from "./hanja-repo";
import type { NamingParams } from "./params";
import { recommendNames, type NameGroup, type NameHanja } from "./recommend";
import { compareAnalysis } from "./score";
import { TREND_MIN } from "./trend";

export type NamingResult =
  | {
      ok: true;
      saju: ReturnType<typeof analyzeSaju>;
      surname: NameHanja[];
      /** 한글 이름별 묶음 (대표 조합의 기본 순위 점수 순, 최대 CANDIDATE_LIMIT개) */
      groups: NameGroup[];
      /** 이름(성 제외) → 출생 통계 요약. 통계 데이터가 적재되지 않았으면 null */
      stats: Map<string, NameStatSummary> | null;
      /** 사용자에게 알릴 안내 (예: 통계 미적재로 필터 미적용) */
      notice?: string;
    }
  | { ok: false; error: string };

/** 화면에 보여 줄 이름 수 */
export const DISPLAY_LIMIT = 30;
/** 서버에서 넘기는 후보 이름 수. 우선순위를 바꾸면 이 안에서 맞춤 점수 상위 DISPLAY_LIMIT개를 보여 준다 */
export const CANDIDATE_LIMIT = 60;

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
  const { yongsin: needed, huisin, gisin } = saju.yongsin;

  // 대법원 인명용 한자 전체 (불용한자와 부정적·불분명한 뜻 제외)
  const pool = await fetchPool(supabase);
  let first = pool;
  let second = pool;
  const allowSyllables = new Set<string>();
  if (p.dolrimja) {
    allowSyllables.add(p.dolrimja.syllable);
    let fixed = await fetchByEum(supabase, p.dolrimja.syllable);
    // 돌림자는 사용자가 정한 글자이므로 후보를 넓게 두되, 품질 좋은 글자가 있으면 그쪽을 우선한다
    const good = fixed.filter((c) => c.suitability !== "exclude");
    if (good.length > 0) fixed = good;
    if (fixed.length === 0) {
      return { ok: false, error: `돌림자 '${p.dolrimja.syllable}'에 해당하는 한자가 없습니다.` };
    }
    if (p.dolrimja.position === 1) first = fixed;
    else second = fixed;
  }


  const run = (minLuckyGyeok: number, minTrend: number) =>
    recommendNames({
      surname,
      first: p.length === "1" ? [] : first,
      second: p.length === "1" ? [] : second,
      single: p.length === "2" || p.dolrimja ? [] : pool,
      neededElement: needed,
      favorableElement: huisin,
      unfavorableElement: gisin,
      requireNeeded: true,
      minLuckyGyeok,
      minGlobalScore: p.globalFriendly ? 70 : 0,
      minTrend,
      allowSyllables,
      // 젠더 뉴트럴은 통계로 거르므로 후보를 넉넉히 뽑는다
      limit: p.neutral ? 150 : CANDIDATE_LIMIT,
    });

  // 4격이 모두 길수이고 요즘 어감인 이름을 우선하고, 후보가 부족하면 단계적으로 완화한다
  let groups = run(4, TREND_MIN);
  if (groups.length < 10) groups = run(3, TREND_MIN);
  if (groups.length < 10) groups = run(3, 0);

  // 출생 통계 연동 (희소성 표시·우선순위 + 젠더 뉴트럴 필터)
  let stats: Map<string, NameStatSummary> | null = null;
  let notice: string | undefined;
  try {
    const loaded = await loadNameSummaries(
      supabase,
      groups.map((g) => g.hangul)
    );
    stats = loaded?.summaries ?? null;
  } catch (e) {
    console.error("[naming] 통계 조회 실패", e);
  }

  // 대표 조합의 기본 순위 점수(성명학 + 한자 뜻 + 요즘 어감) 순.
  // 동점이면 사주 보완 → 수리 → 발음오행 → 희소성(누적 건수가 적은 이름) 순
  const births = (g: NameGroup) => {
    const c = stats?.get(g.hangul)?.cumulative;
    return c ? c.male + c.female : 0;
  };
  groups.sort(
    (a, b) =>
      b.options[0].baseScore - a.options[0].baseScore ||
      compareAnalysis(a.options[0].analysis, b.options[0].analysis) ||
      births(a) - births(b) ||
      a.hangul.localeCompare(b.hangul, "ko")
  );

  if (p.neutral) {
    if (!stats) {
      notice = "출생 통계 데이터가 아직 적재되지 않아 젠더 뉴트럴 조건은 적용되지 않았습니다.";
    } else {
      // 통계에 한 번도 오르지 않은 이름은 성비를 알 수 없어 제외한다
      groups = groups.filter((g) => stats!.get(g.hangul)?.neutral);
      if (groups.length === 0) {
        notice = "젠더 뉴트럴 조건을 만족하는 추천 이름이 없습니다. 조건을 완화해 보세요.";
      }
    }
  }
  // 희귀/인기 정렬과 우선순위 가점은 결과 화면에서 바로 바꿀 수 있도록 브라우저에서 처리한다
  groups = groups.slice(0, CANDIDATE_LIMIT);

  return { ok: true, saju, surname, groups, stats, notice };
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
  const { yongsin, huisin, gisin } = base.saju.yongsin;
  const analysis = analyzeName({
    surname: base.surname,
    givenName: given,
    neededElement: yongsin,
    favorableElement: huisin,
    unfavorableElement: gisin,
  });
  return { ...base, given, analysis };
}
