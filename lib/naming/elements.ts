import type { Element, ElementFlow, Relation, ResourceFlow } from "./types";

const ORDER: Element[] = ["목", "화", "토", "금", "수"];

/** 수리오행: 획수 끝자리 1,2=목 3,4=화 5,6=토 7,8=금 9,0=수 */
export function strokeElement(n: number): Element {
  const d = n % 10;
  if (d === 1 || d === 2) return "목";
  if (d === 3 || d === 4) return "화";
  if (d === 5 || d === 6) return "토";
  if (d === 7 || d === 8) return "금";
  return "수";
}

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;
const CHOSEONG = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

/** 한글 음절의 초성. 한글 음절이 아니면 null */
export function choseong(ch: string): string | null {
  const code = ch.charCodeAt(0);
  if (code < HANGUL_BASE || code > HANGUL_END) return null;
  return CHOSEONG[Math.floor((code - HANGUL_BASE) / 588)];
}

/** 발음오행: ㄱㅋ=목 ㄴㄷㄹㅌ=화 ㅇㅎ=토 ㅅㅈㅊ=금 ㅁㅂㅍ=수 (된소리는 평음과 동일) */
const PRONUNCIATION: Record<string, Element> = {
  ㄱ: "목", ㄲ: "목", ㅋ: "목",
  ㄴ: "화", ㄷ: "화", ㄸ: "화", ㄹ: "화", ㅌ: "화",
  ㅇ: "토", ㅎ: "토",
  ㅅ: "금", ㅆ: "금", ㅈ: "금", ㅉ: "금", ㅊ: "금",
  ㅁ: "수", ㅂ: "수", ㅃ: "수", ㅍ: "수",
};

export function pronunciationElement(syllable: string): Element | null {
  const c = choseong(syllable);
  return c ? PRONUNCIATION[c] ?? null : null;
}

/** a가 b를 생(生)하는가: 목→화→토→금→수→목 */
function generates(a: Element, b: Element) {
  return ORDER[(ORDER.indexOf(a) + 1) % 5] === b;
}

/**
 * 앞 글자(a)에서 뒤 글자(b)로 흐르는 관계.
 * 생: a가 b를 생함 / 설: b가 a를 생함(기운이 빠져나감) / 극: 한쪽이 다른 쪽을 극함 / 비화: 같은 오행
 */
export function relation(a: Element, b: Element): Relation {
  if (a === b) return "비화";
  if (generates(a, b)) return "생";
  if (generates(b, a)) return "설";
  return "극";
}

const RELATION_SCORE: Record<Relation, number> = {
  생: 100,
  비화: 70,
  설: 50,
  극: 0,
};

/**
 * 오행 배열의 인접 관계를 평가. 모든 글자가 같은 오행이면 편중으로 감점.
 * `weights`를 주면 앞쪽 관계부터 차례로 가중 평균한다 (모자라면 마지막 값을 반복).
 */
export function evaluateFlow(elements: Element[], weights?: readonly number[]): ElementFlow {
  const relations: Relation[] = [];
  for (let i = 0; i < elements.length - 1; i++) {
    relations.push(relation(elements[i], elements[i + 1]));
  }
  if (relations.length === 0) {
    return { elements, relations, score: 70 };
  }
  const w = relations.map((_, i) => weights?.[Math.min(i, weights.length - 1)] ?? 1);
  const wSum = w.reduce((a, b) => a + b, 0);
  let score = relations.reduce((sum, r, i) => sum + RELATION_SCORE[r] * w[i], 0) / wSum;
  if (elements.length >= 3 && new Set(elements).size === 1) score = 40;
  return { elements, relations, score: Math.round(score * 10) / 10 };
}

/** 성씨와 용신 글자가 바로 붙어 상극일 때의 관계 점수. 용신을 채우려다 생긴 상극이라 일반 상극(0)보다 덜 감점한다 */
export const YONGSIN_CLASH_SCORE = 30;

/**
 * 상극인 두 오행을 상생으로 이어 주는 통관 오행 (예: 화·금 → 토, 금·목 → 수).
 * 상극은 상생 순서에서 두 칸 떨어져 있으므로 그 가운데 오행이다. 상극이 아니면 null.
 */
export function bridgeElement(a: Element, b: Element): Element | null {
  if (relation(a, b) !== "극") return null;
  const ia = ORDER.indexOf(a);
  const ib = ORDER.indexOf(b);
  return (ia + 2) % 5 === ib ? ORDER[(ia + 1) % 5] : ORDER[(ib + 1) % 5];
}

/** 성씨가 곧 용신이라 생긴 같은 오행 편중(예: 金+金+金)의 흐름 점수. 일반 편중(40)보다 덜 감점한다 */
export const YONGSIN_SAME_SCORE = 50;

/**
 * 자원오행 흐름 (성 → 이름 글자). evaluateFlow에 성씨·용신 관계 처리를 더한다.
 * - 통관: 성씨와 용신이 상극인데 [성, 통관 오행, 용신] 순서로 이어지면 상생으로 이어진 것으로 보고 만점
 * - 용신 상극: 이름 첫 글자가 용신이고 성씨와 상극이면 그 관계를 YONGSIN_CLASH_SCORE로 본다
 * - 희신 배치: 성씨가 용신과 같은 오행이고 [성, 희신, 용신] 순서(예: 金+土+金)면 희신이 양쪽을 생하므로 만점
 * - 용신 편중: 성씨가 용신과 같은 오행이고 모든 글자가 그 오행이면 YONGSIN_SAME_SCORE
 * 같은 수리·발음이면 통관·희신 배치가 용신 상극·용신 편중보다 조금 높게 나오도록 맞춘 값이다.
 * `elements[0]`이 성씨 오행이고 이름 첫 글자 오행을 알 때만 `surnameFirst`를 true로 넘긴다.
 */
export function evaluateResourceFlow(
  elements: Element[],
  surnameFirst: boolean,
  needed?: Element
): ResourceFlow {
  const flow = evaluateFlow(elements);
  const plain: ResourceFlow = { ...flow, arrangement: null };
  if (!surnameFirst || !needed || elements.length < 2) return plain;

  const [surname, first, second] = elements;
  const full = elements.length === 3;

  if (surname === needed) {
    const huisin = ORDER[(ORDER.indexOf(needed) + 4) % 5]; // 용신을 생하는 오행
    if (full && first === huisin && second === needed) {
      return { ...flow, score: 100, arrangement: "희신 배치" };
    }
    if (full && elements.every((e) => e === needed)) {
      return { ...flow, score: YONGSIN_SAME_SCORE, arrangement: "용신 편중" };
    }
    return plain;
  }

  const bridge = bridgeElement(surname, needed);
  if (bridge && full && first === bridge && second === needed) {
    return { ...flow, score: 100, arrangement: "통관" };
  }
  if (first === needed && bridge) {
    const scores = flow.relations.map((r, i) => (i === 0 ? YONGSIN_CLASH_SCORE : RELATION_SCORE[r]));
    const score = scores.reduce((a, b) => a + b, 0) / scores.length;
    return { ...flow, score: Math.round(score * 10) / 10, arrangement: "용신 상극" };
  }
  return plain;
}
