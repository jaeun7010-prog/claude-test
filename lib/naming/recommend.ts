import { analyzeName } from "./analyze";
import { compareAnalysis } from "./score";
import { globalPronunciationScore } from "./global-pronunciation";
import type { Suitability } from "./hanja-suitability";
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
  /** 한글 이름(그룹) 최대 개수 */
  limit?: number;
}

export interface Recommendation {
  givenName: NameHanja[];
  /** 한글 이름 (성 제외) */
  hangul: string;
  analysis: NamingAnalysis;
  globalScore: number;
  /** 0~1: 요즘 이름 트렌드·발음 조화 점수 */
  trend: number;
  /** 0~1: 한자 뜻 점수 (글자별 뜻 등급의 평균) */
  meaning: number;
  /** 기본 순위 점수 (성명학 + 한자 뜻 + 요즘 어감, ranking.ts). 화면 순서에만 쓴다 */
  baseScore: number;
}

/** 같은 한글 이름의 한자 조합 묶음. options[0]이 기본 순위 점수가 가장 높은 대표 조합 */
export interface NameGroup {
  hangul: string;
  options: Recommendation[];
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

  const S = surname.reduce((n, c) => n + c.strokes, 0);

  /** 4격 길수 개수 (fourGyeok와 같은 규칙). 외자는 b가 없음 */
  const luckyCount = (a: number, b: number | null) =>
    b === null
      ? +isLuckyRaw(a + 1) + +isLuckyRaw(S + a) + +isLuckyRaw(S + 1) + +isLuckyRaw(S + a)
      : +isLuckyRaw(a + b) + +isLuckyRaw(S + a) + +isLuckyRaw(S + b) + +isLuckyRaw(S + a + b);

  const accept = (givenName: NameHanja[], trend: number) => {
    const hangul = hangulOf(givenName);
    const globalScore = globalPronunciationScore(hangul);
    if (globalScore < minGlobalScore) return;
    const analysis = analyzeName({
      surname,
      givenName,
      neededElement,
      favorableElement,
      unfavorableElement,
    });
    const meaning = meaningScore(givenName);
    const baseScore = baseRankScore(analysis.totalScore, meaning, trend);
    scored.push({ givenName, hangul, analysis, globalScore, trend, meaning, baseScore });
    if (scored.length >= KEEP * 4) prune();
  };

  const hasNeed = (c: NameHanja) => c.element === neededElement;
  const needFilter = requireNeeded && !!neededElement;

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

  for (const [eum, group] of groupByEum(single)) {
    const trend = trendScore(eum, allowSyllables);
    if (trend < 0 || trend < minTrend) continue;
    for (const c of group) {
      if (needFilter && !hasNeed(c)) continue;
      if (luckyCount(c.strokes, null) < minLuckyGyeok) continue;
      accept([c], trend);
    }
  }

  const secondGroups = groupByEum(second);
  for (const [eumA, groupA] of groupByEum(first)) {
    for (const [eumB, groupB] of secondGroups) {
      const trend = trendScore(eumA + eumB, allowSyllables);
      if (trend < 0 || trend < minTrend) continue;
      for (const a of groupA) {
        const aHasNeed = hasNeed(a);
        for (const b of groupB) {
          // 용신 오행 글자가 하나도 없는 조합은 제외
          if (needFilter && !aHasNeed && !hasNeed(b)) continue;
          if (luckyCount(a.strokes, b.strokes) < minLuckyGyeok) continue;
          if (a.hanja === b.hanja) continue;
          accept([a, b], trend);
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
