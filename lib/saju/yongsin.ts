import type { Element } from "@/lib/naming/types";
import { BRANCH_ELEMENT, ELEMENT_ORDER, STEM_ELEMENT } from "./constants";
import type { FourPillars } from "./pillars";
import { analyzeRelations, type ElementScores, type SajuRelation } from "./relations";

// ---------------------------------------------------------------------------
// 십성 (일간 기준 관계)
// ---------------------------------------------------------------------------
export type TenGod =
  | "비견" | "겁재" | "식신" | "상관" | "편재" | "정재"
  | "편관" | "정관" | "편인" | "정인";

/** 오행 a가 b를 생하는가 */
const generates = (a: Element, b: Element) =>
  ELEMENT_ORDER[(ELEMENT_ORDER.indexOf(a) + 1) % 5] === b;

/** 오행 a가 b를 극하는가 */
const controls = (a: Element, b: Element) =>
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

// ---------------------------------------------------------------------------
// 오행 세력: 위치별 가중치 + 지장간 분배 후 합·충·형 반영 (relations.ts)
// ---------------------------------------------------------------------------
export type { ElementScores };

export function elementScores(p: FourPillars): ElementScores {
  return analyzeRelations(p).scores;
}

// ---------------------------------------------------------------------------
// 신강/신약 + 용신
// ---------------------------------------------------------------------------
export type Strength = "극신강" | "신강" | "중화" | "신약" | "극신약";

export interface YongsinResult {
  dayMaster: { stem: number; element: Element };
  /** 합·충·형 반영 후 오행 세력 */
  scores: ElementScores;
  /** 합·충·형 반영 전 오행 세력 */
  rawScores: ElementScores;
  /** 원국의 합·충·형 근거 */
  relations: SajuRelation[];
  /** 십성군별 점수: 비겁/식상/재성/관성/인성 */
  groups: Record<"비겁" | "식상" | "재성" | "관성" | "인성", number>;
  /** 일간을 돕는 힘(비겁+인성) / 전체 */
  selfRatio: number;
  strength: Strength;
  /** 용신 오행 — 작명(자원오행) 보강 대상 */
  yongsin: Element;
  /** 희신: 용신을 생하는 오행 */
  huisin: Element;
  /** 기신: 용신을 극하는 오행 (이름에서 피하는 것이 좋음) */
  gisin: Element;
  /** 용신을 정한 방식 */
  method: "억부" | "조후" | "균형";
  reason: string;
}

function groupsOf(dm: Element, s: ElementScores) {
  const next = ELEMENT_ORDER[(ELEMENT_ORDER.indexOf(dm) + 1) % 5]; // 내가 생함 = 식상
  const wealth = ELEMENT_ORDER[(ELEMENT_ORDER.indexOf(dm) + 2) % 5]; // 내가 극함 = 재성
  const official = ELEMENT_ORDER[(ELEMENT_ORDER.indexOf(dm) + 3) % 5]; // 나를 극함 = 관성
  const resource = ELEMENT_ORDER[(ELEMENT_ORDER.indexOf(dm) + 4) % 5]; // 나를 생함 = 인성
  return {
    elements: { 비겁: dm, 식상: next, 재성: wealth, 관성: official, 인성: resource },
    scores: {
      비겁: s[dm],
      식상: s[next],
      재성: s[wealth],
      관성: s[official],
      인성: s[resource],
    },
  };
}

function classify(ratio: number): Strength {
  if (ratio >= 0.7) return "극신강";
  if (ratio >= 0.55) return "신강";
  if (ratio > 0.42) return "중화";
  if (ratio > 0.28) return "신약";
  return "극신약";
}

const FIRE_SHARE_MIN = 0.12; // 겨울생: 화 비중이 이보다 낮으면 조후로 火 필요
const WATER_SHARE_MIN = 0.12; // 여름생: 수 비중이 이보다 낮으면 조후로 水 필요

const WINTER = new Set([11, 0, 1]); // 亥子丑
const SUMMER = new Set([5, 6, 7]); // 巳午未

/**
 * 억부(抑扶) 용신 + 조후(調候) 보정.
 *
 * 오행 세력은 합·충·형을 반영한 값으로 본다. 격국 판단은 아직 반영하지 않는다.
 */
export function deriveYongsin(
  p: FourPillars,
  /** ignoreRelations: 합·충·형 반영 전 세력으로 판단 (보강 전후 비교용) */
  options: { ignoreRelations?: boolean } = {}
): YongsinResult {
  const dmStem = p.day.stem;
  const dm = STEM_ELEMENT[dmStem];
  const analyzed = analyzeRelations(p);
  const { rawScores, relations } = analyzed;
  const scores = options.ignoreRelations ? rawScores : analyzed.scores;
  const total = ELEMENT_ORDER.reduce((sum, e) => sum + scores[e], 0);
  const { elements, scores: groups } = groupsOf(dm, scores);

  const selfRatio = (groups.비겁 + groups.인성) / total;
  const strength = classify(selfRatio);

  let yongsin: Element;
  let method: YongsinResult["method"];
  let reason: string;

  if (strength === "극신강" || strength === "신강") {
    // 일간이 강함: 설기(식상)·재성·관성 중 가장 부족한 쪽으로 힘을 뺀다
    const order = ["식상", "관성", "재성"] as const; // 동점 시 우선순위
    const pick = order.reduce((best, g) => (groups[g] < groups[best] ? g : best), order[0]);
    yongsin = elements[pick];
    method = "억부";
    reason = `일간(${dm})이 ${strength}하여 힘을 덜어 줄 ${pick}(${yongsin})을 용신으로 삼았습니다.`;
  } else if (strength === "신약" || strength === "극신약") {
    // 일간이 약함: 가장 큰 압박 세력을 보고 인성(생) 또는 비겁(조력)을 택한다
    const pressure = (["식상", "재성", "관성"] as const).reduce((best, g) =>
      groups[g] > groups[best] ? g : best
    );
    const pick = pressure === "재성" ? "비겁" : "인성";
    yongsin = elements[pick];
    method = "억부";
    reason = `일간(${dm})이 ${strength}하고 ${pressure} 세력이 커서 ${pick}(${yongsin})으로 보강합니다.`;
  } else {
    // 중화: 가장 부족한 오행을 채워 균형을 맞춘다 (동점 시 일간을 생하는 쪽 우선)
    const pick = [elements.인성, elements.식상, elements.재성, elements.관성, elements.비겁].reduce(
      (best, e) => (scores[e] < scores[best] ? e : best)
    );
    yongsin = pick;
    method = "균형";
    reason = `일간(${dm})이 중화에 가까워 가장 부족한 ${pick}을(를) 보충합니다.`;
  }

  // 조후 보정: 한난조습이 극단이면 조후를 우선한다
  const mb = p.month.branch;
  if (WINTER.has(mb) && scores.화 / total < FIRE_SHARE_MIN) {
    reason +=
      yongsin !== "화"
        ? " 다만 한겨울생이고 화(火) 기운이 부족해 조후용신 화(火)를 우선합니다."
        : " 한겨울생이고 화(火) 기운이 부족해 조후 측면에서도 화(火)가 필요합니다.";
    yongsin = "화";
    method = "조후";
  } else if (SUMMER.has(mb) && scores.수 / total < WATER_SHARE_MIN) {
    reason +=
      yongsin !== "수"
        ? " 다만 한여름생이고 수(水) 기운이 부족해 조후용신 수(水)를 우선합니다."
        : " 한여름생이고 수(水) 기운이 부족해 조후 측면에서도 수(水)가 필요합니다.";
    yongsin = "수";
    method = "조후";
  }

  const idx = ELEMENT_ORDER.indexOf(yongsin);
  return {
    dayMaster: { stem: dmStem, element: dm },
    scores,
    rawScores,
    relations,
    groups,
    selfRatio: Math.round(selfRatio * 1000) / 1000,
    strength,
    yongsin,
    huisin: ELEMENT_ORDER[(idx + 4) % 5],
    gisin: ELEMENT_ORDER[(idx + 3) % 5],
    method,
    reason,
  };
}

/** 지지 본 오행 조회용 (UI 표시에 사용) */
export const branchElement = (branch: number) => BRANCH_ELEMENT[branch];
