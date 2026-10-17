export * from "./constants";
export {
  calculateFourPillars,
  type BirthInput,
  type FourPillars,
  type Pillar,
} from "./pillars";
export {
  deriveYongsin,
  elementScores,
  tenGod,
  type TenGod,
  type Strength,
  type YongsinResult,
  type ElementScores,
} from "./yongsin";
export { analyzeRelations, RELATION_FACTORS, type SajuRelation } from "./relations";
export {
  analyzeGeokguk,
  GEOK_EASY,
  type Geokguk,
  type GeokName,
  type OuterCandidate,
} from "./geokguk";
export { TEN_GOD_GROUP, type TenGodGroup } from "./ten-gods";

import { calculateFourPillars, type BirthInput, type Pillar } from "./pillars";
import { deriveYongsin } from "./yongsin";

/** 출생지 경도 보정 결과. 출생 시각을 모르면 null */
export interface TimeCorrection {
  /** 보정량(분). 음수면 시계보다 이르다 */
  minutes: number;
  /** 보정된 시각 (0~23시, 분) */
  corrected: { hour: number; minute: number };
  /** 보정하지 않았을 때(시계 시각 그대로)의 일주·시주 */
  uncorrected: { day: Pillar; hour: Pillar | null };
  hourChanged: boolean;
  dayChanged: boolean;
}

/** 출생 정보 → 사주 + 용신. 작명 엔진의 neededElement로 yongsin.yongsin을 전달하세요. */
export function analyzeSaju(input: BirthInput) {
  const pillars = calculateFourPillars(input);

  let timeCorrection: TimeCorrection | null = null;
  if (input.hour !== undefined && input.longitude !== null) {
    const raw = calculateFourPillars({ ...input, longitude: null });
    const local = pillars.meta.localSolarDate;
    timeCorrection = {
      minutes: pillars.meta.correctionMinutes,
      corrected: { hour: local.getUTCHours(), minute: local.getUTCMinutes() },
      uncorrected: { day: raw.day, hour: raw.hour },
      hourChanged: raw.hour?.index !== pillars.hour?.index,
      dayChanged: raw.day.index !== pillars.day.index,
    };
  }

  return { pillars, yongsin: deriveYongsin(pillars), timeCorrection };
}
