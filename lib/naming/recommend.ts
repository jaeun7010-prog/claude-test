import { analyzeName } from "./analyze";
import { compareAnalysis } from "./score";
import { globalPronunciationScore } from "./global-pronunciation";
import { hasPositiveMeaning } from "./hanja-meaning";
import { isLuckyRaw } from "./suri81";
import { trendScore } from "./trend";
import type { Element, HanjaChar, NamingAnalysis } from "./types";

/** 사전에서 읽어 온 한자 한 글자 (추천 후보) */
export interface NameHanja extends HanjaChar {
  /** 영문 뜻풀이 (Unihan) — 후보 선별용 */
  meaning: string | null;
  /** 한글 훈 (예: 金 → 쇠). 화면에는 `훈 음`(쇠 금)으로 보여 준다 */
  hun: string | null;
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
  /** 0~1: 요즘 이름 트렌드·발음 조화 점수 (정렬 가중치) */
  trend: number;
}

/** 같은 한글 이름의 한자 조합 묶음. options[0]이 성명학 점수가 가장 높은 대표 조합 */
export interface NameGroup {
  hangul: string;
  options: Recommendation[];
}

/** 순위 산정 시 트렌드 점수(0~1)에 곱하는 가중치 */
const TREND_WEIGHT = 35;
/** 뜻이 긍정적인 한자 한 글자당 가산점 */
const MEANING_BONUS = 2;

const hangulOf = (chars: NameHanja[]) => chars.map((c) => c.eum).join("");

// 뜻이 긍정적인 글자 수 (한자의 교육용 여부와는 무관)
const positiveCount = (r: Recommendation) =>
  r.givenName.filter((c) => hasPositiveMeaning(c.meaning)).length;

/** 같은 한글 이름 안에서 한자 조합 비교: 성명학 점수 → 뜻 → 한자 순 */
export const compareOptions = (x: Recommendation, y: Recommendation) =>
  compareAnalysis(x.analysis, y.analysis) ||
  positiveCount(y) - positiveCount(x) ||
  hanjaOf(x).localeCompare(hanjaOf(y));

const hanjaOf = (r: Recommendation) => r.givenName.map((c) => c.hanja).join("");

/**
 * 후보 조합을 전수 평가해 한글 이름별로 묶어 반환.
 * 어떤 한글 이름을 고를지는 트렌드·뜻 가산점을 더한 순위로 정하고(낯선 어감 배제),
 * 이름 안의 한자 조합은 성명학 점수 순으로 정렬한다. 화면 정렬은 호출하는 쪽에서 한다.
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

  // 성명학 점수(0~100)에 트렌드 점수(0~1)와 뜻 가산점을 더해, 어감이 현대적이고 뜻이 좋은 이름을 앞에 둔다
  const rank = (r: Recommendation) =>
    r.analysis.totalScore + TREND_WEIGHT * r.trend + MEANING_BONUS * positiveCount(r);
  const byRank = (x: Recommendation, y: Recommendation) =>
    rank(y) - rank(x) ||
    y.globalScore - x.globalScore ||
    x.hangul.localeCompare(y.hangul, "ko");

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
    scored.push({ givenName, hangul, analysis, globalScore, trend });
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

  // 순위가 높은 한글 이름부터 limit개를 고르고, 이름마다 성명학 점수가 높은 한자 조합 maxPerName개를 담는다
  const byName = new Map<string, Recommendation[]>();
  for (const r of scored) {
    const list = byName.get(r.hangul);
    if (list) list.push(r);
    else if (byName.size < limit) byName.set(r.hangul, [r]);
  }
  return [...byName].map(([hangul, list]) => ({
    hangul,
    options: list.sort(compareOptions).slice(0, maxPerName),
  }));
}
