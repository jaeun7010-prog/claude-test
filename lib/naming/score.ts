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

/**
 * 발음오행 관계 가중치 (가중 평균이라 합이 1이 아니어도 된다).
 * - junction: 성 끝 글자 → 이름 첫 글자
 * - given: 이름 안의 관계 전체 (관계가 여럿이면 똑같이 나눈다. 2자 이름이면 첫 글자 → 둘째 글자 하나)
 * - surname: 복성 두 글자 사이 관계. 모든 후보에 같으므로 작게 둔다
 * 단성 2자 이름은 0.6 / 0.4로 예전과 같다.
 * 2026-10-24부터 성명학 점수의 발음오행 항목은 PRONUNCIATION_CLASH_SCORE로 정하고, 이 가중치는 흐름 표시와
 * 순우리말 이름 점수(native/score.ts)에만 쓴다.
 */
export const PRONUNCIATION_FLOW_WEIGHTS = { junction: 0.6, given: 0.4, surname: 0.2 } as const;

/**
 * 성명학 점수의 발음오행 항목 (2026-10-24 사용자 결정). 상극만 흠으로 본다:
 * 이름 쪽 관계(성 끝 글자 → 이름 첫 글자, 이름 안 글자 사이)의 상극이 0곳 100 · 1곳 80 · 2곳 이상 40.
 * 상생·비화·설·같은 오행 편중은 감점하지 않고, 복성 두 글자 사이 관계는 세지 않는다.
 * 근거: 상극 한두 곳은 크게 문제 삼지 않고 종합적으로 보는 작명 현장의 견해, 발음오행 자체의 원리 문제
 * (김기승·이종훈 2019, 「훈민정음 한글발음의 성명학 적용 논점 고찰」).
 */
export const PRONUNCIATION_CLASH_SCORE = [100, 80, 40] as const;

/** 사주 보완: 이름 한 글자의 자원오행이 무엇이냐에 따른 점수 (0~1) */
export const SAJU_CHAR_SCORE = {
  yongsin: 1,
  huisin: 0.6,
  /** 통관 배치에서 성씨와 용신을 이어 주는 글자 (희신과 같게 본다) */
  tonggwan: 0.6,
  neutral: 0.3,
  gisin: 0,
} as const;

/**
 * 이름에 용신 글자가 하나라도 있을 때 나머지 글자의 사주 보완 점수 (2026-10-24 사용자 결정).
 * 필요한 기운을 한 글자로 채웠으면 나머지 글자는 방해하는 기운(기신)만 피하면 되므로 희신·중립 감점을 줄인다.
 * 두 글자 이름이면 용신 + 희신(통관) 85 · 용신 + 중립 70 · 용신 + 기신 50 (예전 80 / 65 / 50). 용신이 없으면 SAJU_CHAR_SCORE 그대로
 */
export const SAJU_WITH_YONGSIN = { huisin: 0.7, neutral: 0.4 } as const;

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
