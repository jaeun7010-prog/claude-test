import type { Element, FourGyeokKey, Grade, NamingAnalysis } from "./types";

/** 성명학 점수 항목별 배점 (합 100). 판단할 정보가 없는 항목은 빼고 나머지로 환산한다 */
export const SCORE_WEIGHTS = {
  saju: 35,
  suri: 30,
  pronunciation: 20,
  resource: 15,
} as const;

/** 4격 가중치 (합 1). 형격·정격을 원격·이격보다 중하게 본다 */
export const GYEOK_WEIGHTS: Record<FourGyeokKey, number> = {
  won: 0.2,
  hyeong: 0.3,
  i: 0.2,
  jeong: 0.3,
};

/**
 * 수리 항목 안의 구성 (합 1).
 * - luck: 4격 길흉 (GYEOK_WEIGHTS 가중)
 * - flow: 수리오행 흐름 (원격 → 형격 → 이격의 수리오행이 상생하는가)
 * - yinYang: 획수 음양 조화 (성·이름 글자 획수의 홀짝이 한쪽으로만 쏠리지 않았는가)
 * 추천 후보는 4격이 대부분 길수라 luck만으로는 순위가 갈리지 않아, 한자마다 달라지는 두 요소를 함께 본다.
 */
export const SURI_PARTS = {
  luck: 0.6,
  flow: 0.25,
  yinYang: 0.15,
} as const;

/** 발음오행 관계 가중치: 성 → 이름 첫 글자, 이름 첫 글자 → 둘째 글자 */
export const PRONUNCIATION_FLOW_WEIGHTS = [0.6, 0.4] as const;

/** 사주 보완: 이름 한 글자의 자원오행이 무엇이냐에 따른 점수 (0~1) */
export const SAJU_CHAR_SCORE = {
  yongsin: 1,
  huisin: 0.6,
  neutral: 0.3,
  gisin: 0,
} as const;

/** 등급 하한 (이상). 나머지는 C */
export const GRADE_MIN: Record<Exclude<Grade, "C">, number> = {
  S: 92,
  A: 86,
  B: 80,
};

export function gradeOf(score: number): Grade {
  if (score >= GRADE_MIN.S) return "S";
  if (score >= GRADE_MIN.A) return "A";
  if (score >= GRADE_MIN.B) return "B";
  return "C";
}

/** 이름 글자 하나의 사주 보완 점수 (0~1). 자원오행을 모르면 null */
export function sajuCharScore(
  element: Element | null,
  saju: { needed?: Element; favorable?: Element; unfavorable?: Element }
): number | null {
  if (!element) return null;
  if (element === saju.needed) return SAJU_CHAR_SCORE.yongsin;
  if (element === saju.favorable) return SAJU_CHAR_SCORE.huisin;
  if (element === saju.unfavorable) return SAJU_CHAR_SCORE.gisin;
  return SAJU_CHAR_SCORE.neutral;
}

/**
 * 성명학 점수 비교 (내림차순). 종합 점수가 같으면 사주 보완 → 수리 → 발음오행 순.
 * 희소성은 한글 이름 단위라 이름 카드 정렬에서 따로 비교한다.
 */
export function compareAnalysis(a: NamingAnalysis, b: NamingAnalysis): number {
  return (
    b.totalScore - a.totalScore ||
    (b.breakdown.saju ?? -1) - (a.breakdown.saju ?? -1) ||
    b.breakdown.suri - a.breakdown.suri ||
    b.breakdown.pronunciation - a.breakdown.pronunciation
  );
}
