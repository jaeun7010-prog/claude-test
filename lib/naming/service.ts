import type { SupabaseClient } from "@supabase/supabase-js";

import { analyzeSaju } from "@/lib/saju";
import { loadNameSummaries, type NameStatSummary } from "@/lib/stats/name-stats";
import { analyzeName, analyzeWithPrefix } from "./analyze";
import { diagnoseCombination, type CombinationItem } from "./combination";
import { applyGender } from "./gender-hanja";
import { fetchByEum, fetchPool, fetchSurname } from "./hanja-repo";
import type { NamingParams } from "./params";
import { recommendNames, type NameGroup, type NameHanja } from "./recommend";
import { compareAnalysis } from "./score";
import { TREND_MIN } from "./trend";
import type { NamingAnalysis } from "./types";

export type NamingResult =
  | {
      ok: true;
      saju: ReturnType<typeof analyzeSaju>;
      surname: NameHanja[];
      /** 부모 성 함께 쓰기의 고정 앞 글자 (이름의 일부). 없으면 빈 배열 */
      prefix: NameHanja[];
      /** 부모 성 함께 쓰기의 조합 진단 (고정된 부분의 약점). 해당 없으면 null */
      combination: CombinationItem[] | null;
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

/** 성씨 한자(부모 성 함께 쓰기면 그 성 글자도) + 사주 계산. 추천/저장에서 공통으로 사용 */
export async function prepare(supabase: SupabaseClient, p: NamingParams) {
  const surname = await fetchSurname(supabase, [...p.surnameHanja], [...p.surname]);
  if (!surname) return null;
  let prefix: NameHanja[] = [];
  if (p.parentSurname) {
    const found = await fetchSurname(supabase, [...p.parentSurname.hanja], [...p.parentSurname.hangul]);
    if (!found) return null;
    prefix = found;
  }
  return { surname, prefix, saju: analyzeSaju(p.birth) };
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
    const [hangul, hanja] = p.parentSurname
      ? [`${p.surname}·${p.parentSurname.hangul}`, `${p.surnameHanja}·${p.parentSurname.hanja}`]
      : [p.surname, p.surnameHanja];
    return {
      ok: false,
      error: `'${hangul}' 성에 해당하는 한자 ${hanja}을(를) 사전에서 찾을 수 없습니다.`,
    };
  }
  const { surname, prefix, saju } = base;
  const { yongsin: needed, huisin, gisin } = saju.yongsin;

  // 대법원 인명용 한자 전체 (불용한자와 부정적·불분명한 뜻 제외)
  // 성별 뜻이 뚜렷한 글자는 아이 성별에 맞게 빼거나 감점한다 (gender-hanja.ts).
  // 애매 등급은 먼저 거른다: 남자아이의 男·郞은 applyGender에서 애매 점수로 낮추지만 후보에는 남아야 하므로
  const raw = await fetchPool(supabase);
  const fullPool = applyGender(raw, p.gender);
  const strictPool = applyGender(
    raw.filter((c) => c.suitability !== "obscure"),
    p.gender
  );
  let fixed: NameHanja[] | null = null;
  const allowSyllables = new Set<string>();
  if (p.dolrimja) {
    allowSyllables.add(p.dolrimja.syllable);
    fixed = await fetchByEum(supabase, p.dolrimja.syllable);
    // 돌림자는 사용자가 정한 글자이므로 후보를 넓게 두되(애매 등급 포함), 품질 좋은 글자가 있으면 그쪽을 우선한다
    const good = fixed.filter((c) => c.suitability !== "exclude");
    if (good.length > 0) fixed = good;
    if (fixed.length === 0) {
      return { ok: false, error: `돌림자 '${p.dolrimja.syllable}'에 해당하는 한자가 없습니다.` };
    }
  }

  const run = (pool: NameHanja[], minLuckyGyeok: number, minTrend: number) =>
    recommendNames({
      surname,
      prefix,
      first: p.length === "1" ? [] : p.dolrimja?.position === 1 ? fixed! : pool,
      second: p.length === "1" ? [] : p.dolrimja?.position === 2 ? fixed! : pool,
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
  const generate = (pool: NameHanja[]) => {
    let g = run(pool, 4, TREND_MIN);
    if (g.length < 10) g = run(pool, 3, TREND_MIN);
    if (g.length < 10) g = run(pool, 3, 0);
    return g;
  };
  // 애매 등급(교육용도 아니고 뜻도 긍정적이지 않은 희귀 한자)은 자동 추천에서 뺀다. 화면에 보일 이름이 DISPLAY_LIMIT개보다 적을 때만
  // (주로 외자·돌림자) 애매 등급까지 넣은 결과에서 모자란 이름을 채운다. 같은 한글 이름은 애매 등급 없는 쪽을 쓴다 (2026-10-18 사용자 결정)
  let groups = generate(strictPool);
  if (groups.length < DISPLAY_LIMIT) {
    const have = new Set(groups.map((g) => g.hangul));
    groups = [...groups, ...generate(fullPool).filter((g) => !have.has(g.hangul))];
  }

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

  let combination: CombinationItem[] | null = null;
  if (prefix.length > 0) {
    combination = diagnoseCombination(surname, prefix, { yongsin: needed, gisin });
    // 화면에 먼저 보일 상위 이름들의 법적 이름 전체 기준 점수와 비교
    const top = groups.slice(0, DISPLAY_LIMIT).map((g) => g.options[0]);
    const pairs = top.flatMap((o) => (o.legalAnalysis ? [[o.analysis, o.legalAnalysis] as const] : []));
    if (pairs.length > 0) {
      const gap = pairs.reduce((s, [a, l]) => s + (a.totalScore - l.totalScore), 0) / pairs.length;
      const grades = { S: 0, A: 0, B: 0, C: 0 };
      for (const [, l] of pairs) grades[l.grade]++;
      const gradeText = (["S", "A", "B", "C"] as const)
        .filter((g) => grades[g] > 0)
        .map((g) => `${g} ${grades[g]}개`)
        .join(" · ");
      const diff = Math.round(Math.abs(gap) * 10) / 10;
      combination.push({
        tone: gap >= 3 ? "weak" : "good",
        text:
          `법적 이름 전체(성 + ${prefix.map((c) => c.eum).join("")}○○) 기준으로 계산하면 상위 추천 ${pairs.length}개의 점수가 ` +
          `평균 ${diff}점 ${gap >= 0 ? "낮고" : "높고"}, 등급은 ${gradeText}입니다.`,
      });
    }
  }

  return { ok: true, saju, surname, prefix, combination, groups, stats, notice };
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
  // 부모 성 함께 쓰기면 이름이 그 성 글자로 시작해야 한다
  if (p.parentSurname && !(givenHanja.startsWith(p.parentSurname.hanja) && givenEum.startsWith(p.parentSurname.hangul)))
    return null;
  const given = await fetchSurname(supabase, [...givenHanja], [...givenEum]);
  if (!given || given.length <= base.prefix.length) return null;
  const { yongsin, huisin, gisin } = base.saju.yongsin;
  const saju = { neededElement: yongsin, favorableElement: huisin, unfavorableElement: gisin };
  if (base.prefix.length > 0) {
    // 부모 성 함께 쓰기: 등급·저장·PDF는 새로 고르는 부분 기준, 법적 이름 전체 기준은 참고로 함께 둔다
    const { analysis, legal } = analyzeWithPrefix({
      surname: base.surname,
      prefix: base.prefix,
      givenName: given.slice(base.prefix.length),
      ...saju,
    });
    return {
      ...base,
      given,
      analysis,
      legalAnalysis: legal as NamingAnalysis | null,
      combination: diagnoseCombination(base.surname, base.prefix, { yongsin, gisin }) as CombinationItem[] | null,
    };
  }
  const analysis = analyzeName({ surname: base.surname, givenName: given, ...saju });
  return {
    ...base,
    given,
    analysis,
    legalAnalysis: null as NamingAnalysis | null,
    combination: null as CombinationItem[] | null,
  };
}
