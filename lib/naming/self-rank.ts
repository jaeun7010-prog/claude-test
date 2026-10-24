/**
 * 셀프 작명 (부모가 정한 한글 이름의 한자를 직접 고르기)의 정렬·표시 규칙.
 * 서버에서 만든 조합 점수표(SelfTable, self.ts)만 보고 계산하므로 브라우저에서도 그대로 쓴다.
 * 엔진(analyze.ts 등)이나 유료 문구를 가져오지 않는다. 점수표에는 무료 숫자만 들어 있다.
 *
 * 2026-10-24 사용자 결정:
 *  - 글자마다 훈음만 무료로 보여 준다 (글자 상세 풀이 요약은 유료 그대로)
 *  - 제외 등급 한자는 숨긴다. 애매·어색 등급은 보여 주되 표시를 붙이고 [최고]/[추천] 대상에서 뺀다
 *  - 이름은 1~2자 (+ 부모 성 함께 쓰기)
 *  - [추천]은 A등급 이상, 최대 5개
 *  - 등급은 추천받기와 같은 성명학 점수를 쓰고, 좋은 조합이 적은 소리는 등급을 올리지 않고 표시와 안내로 알린다.
 *    발음오행은 소리로 정해져 한자를 바꿔도 같으므로 "소리로 정해지는 참고 항목"으로 따로 보여 준다 (SelfTable.pronunciation)
 */
import type { Suitability } from "./hanja-suitability";
import type { Grade, ScoreBreakdown } from "./types";

/** 후보 한자 한 글자 (화면에 보내는 값: 훈음과 뜻 등급만) */
export interface SelfChar {
  hanja: string;
  eum: string;
  /** 화면 훈 (허용 목록 이름용 풀이가 있으면 그 풀이) */
  hun: string | null;
  suitability: Exclude<Suitability, "exclude">;
}

/** 조합 하나의 무료 점수 */
export interface SelfScore {
  /** 성명학 점수 (부모 성 함께 쓰기는 새로 고르는 부분 기준) */
  totalScore: number;
  grade: Grade;
  breakdown: ScoreBreakdown;
  /** 원·형·이·정 수리와 길흉 */
  gyeok: { suri: number; lucky: boolean }[];
  /** 기본 순위 점수 (성명학 점수가 같을 때 한자 뜻으로 가르는 데만 쓴다) */
  baseScore: number;
  /** 부모 성 함께 쓰기: 법적 이름 전체 기준 (참고, 무료인 등급·총점만) */
  legal?: { totalScore: number; grade: Grade };
}

export interface SelfSlot {
  /** 이 자리 음절 (예: 서) */
  eum: string;
  chars: SelfChar[];
  /** 뜻 등급이 "제외"라 숨긴 한자 수 */
  hiddenMeaning: number;
  /** 아이 성별에 맞지 않아 뺀 한자 수 (gender-hanja.ts) */
  hiddenGender: number;
}

/**
 * 조합 점수표. 외자는 scores[i], 두 글자는 scores[i * (둘째 자리 글자 수) + j].
 * 두 글자에 같은 한자를 쓰는 조합은 null
 */
export interface SelfTable {
  slots: SelfSlot[];
  scores: (SelfScore | null)[];
  /** 발음오행 항목 점수 (0~100). 소리로 정해져 모든 조합에 같다. 흐름 모양(오행 순서)은 유료라 넣지 않는다 */
  pronunciation: { score: number };
}

/** 자리마다 고른 한자 (slot.chars의 번호). 안 골랐으면 null */
export type SelfPicks = (number | null)[];

/** [추천] 최대 개수 */
export const SELF_RECOMMEND_MAX = 5;
/** [추천] 등급 하한 */
export const SELF_RECOMMEND_GRADES: readonly Grade[] = ["S", "A"];
/** 추천 조합 TOP N */
export const SELF_TOP_COUNT = 3;

/** [최고]/[추천]·추천 조합에 쓸 수 있는 글자 (애매·어색 등급은 표시만 하고 고를 수는 있다) */
export const isBadgeEligible = (c: SelfChar) => c.suitability === "good" || c.suitability === "normal";

/**
 * 점수 비교 (내림차순): 성명학 점수 → 동점 규칙(사주 보완 → 수리 → 발음오행) → 기본 순위 점수(한자 뜻).
 * 화면에 보이는 숫자가 성명학 점수라, 목록 순서가 그 숫자와 어긋나지 않도록 성명학 점수를 먼저 본다.
 * 뜻이 약한 글자(애매·어색)는 정렬하는 쪽에서 따로 뒤로 보낸다
 */
export function compareSelfScore(a: SelfScore, b: SelfScore): number {
  return (
    b.totalScore - a.totalScore ||
    (b.breakdown.saju ?? -1) - (a.breakdown.saju ?? -1) ||
    b.breakdown.suri - a.breakdown.suri ||
    b.breakdown.pronunciation - a.breakdown.pronunciation ||
    b.baseScore - a.baseScore
  );
}

/** 고른 한자 조합의 점수. 다 고르지 않았으면 null */
export function scoreOfPicks(t: SelfTable, picks: SelfPicks): SelfScore | null {
  if (picks.some((p) => p === null)) return null;
  if (t.slots.length === 1) return t.scores[picks[0]!];
  return t.scores[picks[0]! * t.slots[1].chars.length + picks[1]!];
}

/** 모든 조합: [자리별 번호, 점수] */
function* combos(t: SelfTable): Generator<[number[], SelfScore]> {
  if (t.slots.length === 1) {
    for (let i = 0; i < t.scores.length; i++) yield [[i], t.scores[i]!];
    return;
  }
  const n2 = t.slots[1].chars.length;
  for (let k = 0; k < t.scores.length; k++) {
    const s = t.scores[k];
    if (s) yield [[Math.floor(k / n2), k % n2], s];
  }
}

const comboEligible = (t: SelfTable, idx: number[]) => idx.every((i, slot) => isBadgeEligible(t.slots[slot].chars[i]));

export interface SelfCombo {
  /** 자리별 slot.chars 번호 */
  picks: number[];
  score: SelfScore;
}

/**
 * 추천 조합 TOP N. 애매·어색 등급이 없는 조합을 먼저 쓰고, 모자라면 나머지에서 채운다
 * (같은 순서 규칙: compareSelfScore → 한자)
 */
export function topCombos(t: SelfTable, n = SELF_TOP_COUNT): SelfCombo[] {
  const all = [...combos(t)].map(([picks, score]) => ({ picks, score, eligible: comboEligible(t, picks) }));
  const hanjaKey = (c: { picks: number[] }) => c.picks.map((i, s) => t.slots[s].chars[i].hanja).join("");
  all.sort((a, b) => +b.eligible - +a.eligible || compareSelfScore(a.score, b.score) || hanjaKey(a).localeCompare(hanjaKey(b)));
  return all.slice(0, n).map(({ picks, score }) => ({ picks, score }));
}

export type SelfBadge = "최고" | "추천" | null;

export interface SelfRankedChar {
  /** slot.chars 번호 */
  index: number;
  char: SelfChar;
  /**
   * 정렬 기준 점수: 다른 자리를 골랐으면 그 한자와의 조합 점수, 안 골랐으면 이 한자로 만들 수 있는 가장 좋은 조합.
   * 다른 자리에 같은 한자를 골라 조합이 안 되면 null (맨 뒤)
   */
  score: SelfScore | null;
  badge: SelfBadge;
}

/**
 * 한 자리의 후보 한자를 정렬하고 [최고]/[추천]을 붙인다. 쓸 수 있는 글자(애매·어색 제외)를 먼저, 그 안에서 점수 순.
 *  - [최고]: 1위 글자. 등급과 관계없이 붙인다 (좋은 조합이 없다는 것은 selfNotice가 알린다)
 *  - [추천]: 그다음 글자 중 A등급 이상, 최대 SELF_RECOMMEND_MAX개
 */
export function rankSlot(t: SelfTable, slot: number, picks: SelfPicks): SelfRankedChar[] {
  const chars = t.slots[slot].chars;
  const best: (SelfScore | null)[] = chars.map(() => null);
  if (t.slots.length === 1) {
    chars.forEach((_, i) => (best[i] = t.scores[i]));
  } else {
    const other = picks[1 - slot];
    const n2 = t.slots[1].chars.length;
    const at = (i: number, j: number) => (slot === 0 ? t.scores[i * n2 + j] : t.scores[j * n2 + i]);
    const otherLen = t.slots[1 - slot].chars.length;
    for (let i = 0; i < chars.length; i++) {
      if (other !== null && other !== undefined) {
        best[i] = at(i, other);
        continue;
      }
      // 다른 자리가 비어 있으면 그 자리의 쓸 수 있는 글자와의 조합 중 가장 좋은 것 (없으면 전체에서)
      let b: SelfScore | null = null;
      let bEligible: SelfScore | null = null;
      for (let j = 0; j < otherLen; j++) {
        const s = at(i, j);
        if (!s) continue;
        if (!b || compareSelfScore(s, b) < 0) b = s;
        if (isBadgeEligible(t.slots[1 - slot].chars[j]) && (!bEligible || compareSelfScore(s, bEligible) < 0)) bEligible = s;
      }
      best[i] = bEligible ?? b;
    }
  }

  const ranked: SelfRankedChar[] = chars.map((char, index) => ({ index, char, score: best[index], badge: null }));
  ranked.sort(
    (a, b) =>
      (a.score ? 0 : 1) - (b.score ? 0 : 1) ||
      +isBadgeEligible(b.char) - +isBadgeEligible(a.char) ||
      (a.score && b.score ? compareSelfScore(a.score, b.score) : 0) ||
      a.char.hanja.localeCompare(b.char.hanja)
  );

  let bestGiven = false;
  let recommended = 0;
  for (const r of ranked) {
    if (!r.score || !isBadgeEligible(r.char)) continue;
    if (!bestGiven) {
      bestGiven = true;
      r.badge = "최고";
      continue;
    }
    if (recommended < SELF_RECOMMEND_MAX && SELF_RECOMMEND_GRADES.includes(r.score.grade)) {
      r.badge = "추천";
      recommended++;
    }
  }
  return ranked;
}

/** 이 소리로 만들 수 있는 조합의 등급별 개수 (애매·어색 등급이 없는 조합 기준) */
export function gradeCounts(t: SelfTable): Record<Grade, number> {
  const c: Record<Grade, number> = { S: 0, A: 0, B: 0, C: 0 };
  for (const [picks, s] of combos(t)) if (comboEligible(t, picks)) c[s.grade]++;
  return c;
}

export interface SelfNotice {
  /** good: S등급 조합이 있음 / fair: A·B가 최고 / weak: C등급뿐 */
  tone: "good" | "fair" | "weak";
  text: string;
  /** 첫 글자만 두고 둘째 글자를 추천받도록(돌림자) 안내할지 */
  suggestDolrimja: boolean;
}

const fmt = (n: number) => n.toFixed(1);

/** 발음오행이 만점이 아니면 붙이는 문장: 소리로 정해지는 항목이라 한자를 바꿔도 같다 */
export function pronunciationNote(t: SelfTable): string | null {
  return t.pronunciation.score < 100
    ? `발음오행(${t.pronunciation.score}점)은 이름 소리로 정해지는 항목이라 한자를 바꿔도 같아요.`
    : null;
}

/** 좋은 조합이 없으면 솔직하게 알려 주는 문장 (추천 조합 1위 기준). 등급이 낮으면 발음오행 문장을 덧붙인다 */
export function selfNotice(t: SelfTable): SelfNotice | null {
  const [top] = topCombos(t, 1);
  if (!top) return null;
  const hanja = top.picks.map((i, s) => t.slots[s].chars[i].hanja).join("");
  const best = `가장 높은 조합은 ${top.score.grade}등급 ${fmt(top.score.totalScore)}점(${hanja})이에요.`;
  const pron = pronunciationNote(t);
  const withPron = (text: string) => (pron ? `${text} ${pron}` : text);
  const two = t.slots.length === 2;
  switch (top.score.grade) {
    case "S": {
      const n = gradeCounts(t).S;
      return { tone: "good", text: `이 소리로 만들 수 있는 S등급 조합이 ${n}개 있어요.`, suggestDolrimja: false };
    }
    case "A":
      return { tone: "fair", text: withPron(`이 소리로는 S등급 조합이 없어요. ${best}`), suggestDolrimja: false };
    case "B":
      return { tone: "fair", text: withPron(`이 소리로는 A등급 이상 조합이 없어요. ${best}`), suggestDolrimja: two };
    default:
      return {
        tone: "weak",
        text: withPron(`이 소리는 아이 사주와 맞는 한자 조합이 적어요. ${best}`),
        suggestDolrimja: two,
      };
  }
}
