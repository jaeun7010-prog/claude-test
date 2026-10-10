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

import { calculateFourPillars, type BirthInput } from "./pillars";
import { deriveYongsin } from "./yongsin";

/** 출생 정보 → 사주 + 용신. 작명 엔진의 neededElement로 yongsin.yongsin을 전달하세요. */
export function analyzeSaju(input: BirthInput) {
  const pillars = calculateFourPillars(input);
  return { pillars, yongsin: deriveYongsin(pillars) };
}
