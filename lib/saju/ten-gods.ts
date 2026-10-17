import type { Element } from "@/lib/naming/types";
import { ELEMENT_ORDER, STEM_ELEMENT } from "./constants";

// ---------------------------------------------------------------------------
// 십성 (일간 기준 관계)
// ---------------------------------------------------------------------------
export type TenGod =
  | "비견" | "겁재" | "식신" | "상관" | "편재" | "정재"
  | "편관" | "정관" | "편인" | "정인";

/** 십성군 */
export type TenGodGroup = "비겁" | "식상" | "재성" | "관성" | "인성";

export const TEN_GOD_GROUP: Record<TenGod, TenGodGroup> = {
  비견: "비겁", 겁재: "비겁",
  식신: "식상", 상관: "식상",
  편재: "재성", 정재: "재성",
  편관: "관성", 정관: "관성",
  편인: "인성", 정인: "인성",
};

/** 오행 a가 b를 생하는가 */
export const generates = (a: Element, b: Element) =>
  ELEMENT_ORDER[(ELEMENT_ORDER.indexOf(a) + 1) % 5] === b;

/** 오행 a가 b를 극하는가 */
export const controls = (a: Element, b: Element) =>
  ELEMENT_ORDER[(ELEMENT_ORDER.indexOf(a) + 2) % 5] === b;

export function tenGod(dayStem: number, otherStem: number): TenGod {
  const me = STEM_ELEMENT[dayStem];
  const other = STEM_ELEMENT[otherStem];
  const samePolarity = dayStem % 2 === otherStem % 2;
  if (me === other) return samePolarity ? "비견" : "겁재";
  if (generates(me, other)) return samePolarity ? "식신" : "상관";
  if (controls(me, other)) return samePolarity ? "편재" : "정재";
  if (controls(other, me)) return samePolarity ? "편관" : "정관";
  return samePolarity ? "편인" : "정인"; // other가 me를 생함
}

/** 일간 오행 기준 십성군별 오행 */
export function groupElements(dm: Element): Record<TenGodGroup, Element> {
  const at = (k: number) => ELEMENT_ORDER[(ELEMENT_ORDER.indexOf(dm) + k) % 5];
  // 내가 생함 = 식상, 내가 극함 = 재성, 나를 극함 = 관성, 나를 생함 = 인성
  return { 비겁: dm, 식상: at(1), 재성: at(2), 관성: at(3), 인성: at(4) };
}
