import { analyzeName } from "./analyze";
import { naturalness } from "./common-syllables";
import { globalPronunciationScore } from "./global-pronunciation";
import { isLuckyRaw } from "./suri81";
import type { Element, HanjaChar, NamingAnalysis } from "./types";

/** 사전에서 읽어 온 한자 한 글자 (추천 후보) */
export interface NameHanja extends HanjaChar {
  meaning: string | null;
  /** 한문 교육용 기초 한자(널리 알려진 글자) 여부 */
  edu: boolean;
}

export interface RecommendOptions {
  surname: NameHanja[];
  /** 첫째 글자 후보 */
  first: NameHanja[];
  /** 둘째 글자 후보. 외자만 추천하면 비워 둠 */
  second: NameHanja[];
  /** 외자 후보 (이름 한 글자) */
  single: NameHanja[];
  neededElement?: Element;
  /** 글로벌 발음 호환 점수 하한 (0이면 필터 없음) */
  minGlobalScore?: number;
  /** true면 이름에 용신 오행 글자가 하나도 없는 조합은 후보에서 제외 */
  requireNeeded?: boolean;
  /** 4격 중 최소 몇 개가 길수여야 하는지 (기본 3) */
  minLuckyGyeok?: number;
  /** 같은 한글 이름이 결과에 나올 수 있는 최대 횟수 (다양성 확보) */
  maxPerName?: number;
  limit?: number;
}

export interface Recommendation {
  givenName: NameHanja[];
  /** 한글 이름 (성 제외) */
  hangul: string;
  analysis: NamingAnalysis;
  globalScore: number;
  /** 0~1: 흔히 쓰이는 음절의 비율 (정렬 가중치) */
  naturalness: number;
}

const hangulOf = (chars: NameHanja[]) => chars.map((c) => c.eum).join("");

/** 후보 조합을 전수 평가해 점수 순으로 반환 */
export function recommendNames(opts: RecommendOptions): Recommendation[] {
  const {
    surname,
    first,
    second,
    single,
    neededElement,
    minGlobalScore = 0,
    requireNeeded = false,
    minLuckyGyeok = 3,
    maxPerName = 2,
    limit = 30,
  } = opts;

  const scored: Recommendation[] = [];

  const eduCount = (r: Recommendation) => r.givenName.filter((c) => c.edu).length;
  // 종합 점수가 비슷하면 흔히 쓰이는 음절로 이뤄진 이름을 앞에 둔다
  const rank = (r: Recommendation) => r.analysis.totalScore + 15 * r.naturalness;
  const byRank = (x: Recommendation, y: Recommendation) =>
    rank(y) - rank(x) ||
    eduCount(y) - eduCount(x) ||
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

  const accept = (givenName: NameHanja[]) => {
    const hangul = hangulOf(givenName);
    const globalScore = globalPronunciationScore(hangul);
    if (globalScore < minGlobalScore) return;
    const analysis = analyzeName({ surname, givenName, neededElement });
    scored.push({ givenName, hangul, analysis, globalScore, naturalness: naturalness(hangul) });
    if (scored.length >= KEEP * 4) prune();
  };

  const hasNeed = (c: NameHanja) => c.element === neededElement;
  const needFilter = requireNeeded && !!neededElement;

  for (const c of single) {
    if (needFilter && !hasNeed(c)) continue;
    if (luckyCount(c.strokes, null) < minLuckyGyeok) continue;
    accept([c]);
  }
  // 용신 글자가 없는 첫째 글자는 용신 글자인 둘째 글자만 짝지으면 되므로 후보를 미리 좁힌다
  const secondNeed = needFilter ? second.filter(hasNeed) : second;
  for (const a of first) {
    const partners = needFilter && !hasNeed(a) ? secondNeed : second;
    for (const b of partners) {
      if (luckyCount(a.strokes, b.strokes) < minLuckyGyeok) continue;
      if (a.hanja === b.hanja) continue;
      accept([a, b]);
    }
  }

  prune();

  // 같은 한글 이름은 maxPerName개까지만
  const seen = new Map<string, number>();
  const out: Recommendation[] = [];
  for (const r of scored) {
    const n = seen.get(r.hangul) ?? 0;
    if (n >= maxPerName) continue;
    seen.set(r.hangul, n + 1);
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}
