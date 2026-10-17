import type { Element, ElementFlow, Relation } from "./types";

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
