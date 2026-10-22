import { analyzeName, analyzeWithPrefix } from "./analyze";
import { compareAnalysis } from "./score";
import { globalPronunciationScore } from "./global-pronunciation";
import type { Suitability } from "./hanja-suitability";
import type { SoundRule } from "./name-sounds";
import { baseRankScore, meaningScore } from "./ranking";
import { isLuckyRaw } from "./suri81";
import { trendScore } from "./trend";
import type { Element, HanjaChar, NamingAnalysis } from "./types";

/** 사전에서 읽어 온 한자 한 글자 (추천 후보) */
export interface NameHanja extends HanjaChar {
  /** 영문 뜻풀이 (Unihan) — 후보 선별용 */
  meaning: string | null;
  /** 한글 훈 (예: 金 → 쇠). 화면에는 `훈 음`(쇠 금)으로 보여 준다 */
  hun: string | null;
  /** 이름 뜻 적합도 (hanja-suitability.ts). "exclude"는 후보 풀에 들어오지 않는다 */
  suitability: Suitability;
}

/** 한자의 한글 훈음 표기 (훈이 없으면 음만) */
export const hunEum = (c: { hun: string | null; eum: string }) =>
  c.hun ? `${c.hun} ${c.eum}` : c.eum;

export interface RecommendOptions {
  surname: NameHanja[];
  /**
   * 부모 성 함께 쓰기: 이름 앞에 고정으로 붙는 다른 부모의 성 글자 (예: 김박서윤의 朴).
   * 등급·순위는 새로 고르는 부분 기준 점수(analyzeWithPrefix의 analysis)로 정하고, 법적 이름 전체 기준 점수는
   * legalAnalysis에 참고로 남긴다. 글로벌 발음·이름 통계는 법적 이름(박서윤), 요즘 어감·한자 뜻은 새 글자만 본다
   */
  prefix?: NameHanja[];
  /** 첫째 글자 후보 */
  first: NameHanja[];
  /** 둘째 글자 후보. 외자만 추천하면 비워 둠 */
  second: NameHanja[];
  /** 외자 후보 (이름 한 글자) */
  single: NameHanja[];
  neededElement?: Element;
  favorableElement?: Element;
  unfavorableElement?: Element;
  /** 글로벌 발음 호환 점수 하한 (0이면 필터 없음) */
  minGlobalScore?: number;
  /** true면 이름에 용신 오행 글자가 하나도 없는 조합은 후보에서 제외 */
  requireNeeded?: boolean;
  /** 4격 중 최소 몇 개가 길수여야 하는지 (기본 3) */
  minLuckyGyeok?: number;
  /** 한글 이름 하나에 담을 한자 조합 최대 개수 */
  maxPerName?: number;
  /** 트렌드 점수 하한 (0이면 예스러운 음절 제외만 적용하고 나머지는 순위로만 반영) */
  minTrend?: number;
  /** 예스러운 음절이어도 제외하지 않을 음절 (사용자가 지정한 돌림자 등) */
  allowSyllables?: ReadonlySet<string>;
  /** 이름 소리 규칙 (name-sounds.ts). 목록 소리는 가점, 반대 성별·자리가 맞지 않는 소리는 제외. 없으면 적용하지 않음 */
  soundRule?: SoundRule;
  /** 한글 이름(그룹) 최대 개수 */
  limit?: number;
}

export interface Recommendation {
  /** 법적 이름 글자 (부모 성 함께 쓰기면 prefix 포함) */
  givenName: NameHanja[];
  /** 한글 이름 (성 제외, 부모 성 함께 쓰기면 prefix 포함) */
  hangul: string;
  analysis: NamingAnalysis;
  globalScore: number;
  /** 부모 성 함께 쓰기의 법적 이름 전체 기준 점수 (참고용). 해당 없으면 undefined */
  legalAnalysis?: NamingAnalysis;
  /** 0~1: 요즘 이름 트렌드·발음 조화 점수 */
  trend: number;
  /** 이름 소리 목록에 있는 소리인가 (기본 순위 점수 가점) */
  listedSound: boolean;
  /** 0~1: 한자 뜻 점수 (글자별 뜻 등급의 평균) */
  meaning: number;
  /** 기본 순위 점수 (성명학 + 한자 뜻 + 요즘 어감, ranking.ts). 화면 순서에만 쓴다 */
  baseScore: number;
}

/** 같은 한글 이름의 한자 조합 묶음. options[0]이 기본 순위 점수가 가장 높은 대표 조합 */
export interface NameGroup {
  hangul: string;
  options: Recommendation[];
  /** 소리 자리 확인을 풀고 채운 이름 (화면 이름이 모자랄 때만). 어떤 정렬에서도 맨 뒤로 보낸다 */
  soundFill?: boolean;
}

const hangulOf = (chars: NameHanja[]) => chars.map((c) => c.eum).join("");

/**
 * 추천 비교 (내림차순): 기본 순위 점수 → 성명학 동점 규칙(사주 보완 → 수리 → 발음오행) → 한자.
 * 한글 이름 단위의 희소성 비교는 이름 카드를 정렬하는 쪽(service.ts)에서 한다.
 */
export const compareRecommendations = (x: Recommendation, y: Recommendation) =>
  y.baseScore - x.baseScore ||
  compareAnalysis(x.analysis, y.analysis) ||
  hanjaOf(x).localeCompare(hanjaOf(y));

const hanjaOf = (r: Recommendation) => r.givenName.map((c) => c.hanja).join("");

/**
 * 후보 조합을 전수 평가해 한글 이름별로 묶어 반환.
 * 한글 이름과 이름 안의 한자 조합 모두 기본 순위 점수(성명학 + 한자 뜻 + 요즘 어감) 순으로 고른다.
 * 화면 정렬은 호출하는 쪽에서 한다.
 */
export function recommendNames(opts: RecommendOptions): NameGroup[] {
  const {
    surname,
    prefix = [],
    first,
    second,
    single,
    neededElement,
    favorableElement,
    unfavorableElement,
    minGlobalScore = 0,
    requireNeeded = false,
    minLuckyGyeok = 3,
    maxPerName = 5,
    minTrend = 0,
    allowSyllables,
    soundRule,
    limit = 30,
  } = opts;

  const scored: Recommendation[] = [];

  const byRank = (x: Recommendation, y: Recommendation) =>
    compareRecommendations(x, y) || x.hangul.localeCompare(y.hangul, "ko");

  // 후보가 수십만 건이 될 수 있어 일정량이 쌓이면 상위 일부만 남긴다
  const KEEP = Math.max(limit * maxPerName * 20, 2000);
  const prune = () => {
    scored.sort(byRank);
    scored.length = Math.min(scored.length, KEEP);
  };

  // 부모 성 함께 쓰기는 새로 고르는 부분 기준(부모 성을 성 쪽에 붙인 성 합산)으로 4격을 본다
  const S = [...surname, ...prefix].reduce((n, c) => n + c.strokes, 0);

  /** 4격 길수 개수 (fourGyeok와 같은 규칙). 외자는 b가 없음 */
  const luckyCount = (a: number, b: number | null) =>
    b === null
      ? +isLuckyRaw(a + 1) + +isLuckyRaw(S + a) + +isLuckyRaw(S + 1) + +isLuckyRaw(S + a)
      : +isLuckyRaw(a + b) + +isLuckyRaw(S + a) + +isLuckyRaw(S + b) + +isLuckyRaw(S + a + b);

  const prefixHangul = hangulOf(prefix);

  const accept = (chosen: NameHanja[], trend: number, listedSound: boolean) => {
    const givenName = [...prefix, ...chosen];
    const hangul = hangulOf(givenName);
    const globalScore = globalPronunciationScore(hangul);
    if (globalScore < minGlobalScore) return;
    const saju = { neededElement, favorableElement, unfavorableElement };
    let analysis: NamingAnalysis;
    let legalAnalysis: NamingAnalysis | undefined;
    if (prefix.length > 0) {
      ({ analysis, legal: legalAnalysis } = analyzeWithPrefix({ surname, prefix, givenName: chosen, ...saju }));
    } else {
      analysis = analyzeName({ surname, givenName, ...saju });
    }
    const meaning = meaningScore(chosen);
    const baseScore = baseRankScore(analysis.totalScore, meaning, trend, listedSound);
    scored.push({ givenName, hangul, analysis, legalAnalysis, globalScore, trend, listedSound, baseScore, meaning });
    if (scored.length >= KEEP * 4) prune();
  };

  const hasNeed = (c: NameHanja) => c.element === neededElement;
  // 부모 성 함께 쓰기도 새로 고르는 글자에 용신이 있어야 한다 (사주 보완을 새 글자로만 보므로)
  const needFilter = requireNeeded && !!neededElement;
  // 부모 성 끝 음절과 같은 음절로 시작하면 "박박…"처럼 같은 소리가 겹쳐 제외한다
  const repeatsPrefix = (eum: string) => !!prefixHangul && prefixHangul.endsWith(eum);

  // 트렌드 점수는 음(한글)에만 달려 있으므로, 같은 음끼리 묶어 한 번만 계산해
  // 낯선 음절 조합을 한자 단위 전수 조합 전에 통째로 건너뛴다
  const groupByEum = (list: NameHanja[]) => {
    const m = new Map<string, NameHanja[]>();
    for (const c of list) {
      const g = m.get(c.eum);
      if (g) g.push(c);
      else m.set(c.eum, [c]);
    }
    return m;
  };

  /**
   * 요즘 어감 점수와 이름 소리 목록 여부. 후보에서 뺄 소리면 null.
   * 목록 소리는 요즘 어감 하한에 걸리지 않는다 (어감 점수가 하한보다 낮으면 하한으로 본다)
   */
  const soundOf = (given: string): { trend: number; listed: boolean } | null => {
    const t = trendScore(given, allowSyllables);
    if (t < 0) return null;
    if (!soundRule) return t < minTrend ? null : { trend: t, listed: false };
    if (soundRule.listed(given)) return { trend: Math.max(t, minTrend), listed: true };
    if (t < minTrend || !soundRule.allows(given, allowSyllables)) return null;
    return { trend: t, listed: false };
  };

  for (const [eum, group] of groupByEum(single)) {
    if (repeatsPrefix(eum)) continue;
    const sound = soundOf(eum);
    if (!sound) continue;
    for (const c of group) {
      if (needFilter && !hasNeed(c)) continue;
      if (luckyCount(c.strokes, null) < minLuckyGyeok) continue;
      accept([c], sound.trend, sound.listed);
    }
  }

  const secondGroups = groupByEum(second);
  for (const [eumA, groupA] of groupByEum(first)) {
    if (repeatsPrefix(eumA)) continue;
    for (const [eumB, groupB] of secondGroups) {
      const sound = soundOf(eumA + eumB);
      if (!sound) continue;
      for (const a of groupA) {
        const aHasNeed = hasNeed(a);
        for (const b of groupB) {
          // 용신 오행 글자가 하나도 없는 조합은 제외
          if (needFilter && !aHasNeed && !hasNeed(b)) continue;
          if (luckyCount(a.strokes, b.strokes) < minLuckyGyeok) continue;
          if (a.hanja === b.hanja) continue;
          accept([a, b], sound.trend, sound.listed);
        }
      }
    }
  }

  prune();

  // 순위가 높은 한글 이름부터 limit개를 고르고, 이름마다 순위가 높은 한자 조합 maxPerName개를 담는다
  const byName = new Map<string, Recommendation[]>();
  for (const r of scored) {
    const list = byName.get(r.hangul);
    if (list) list.push(r);
    else if (byName.size < limit) byName.set(r.hangul, [r]);
  }
  return [...byName].map(([hangul, list]) => ({
    hangul,
    options: list.sort(compareRecommendations).slice(0, maxPerName),
  }));
}
