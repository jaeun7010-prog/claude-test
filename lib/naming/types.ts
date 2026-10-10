/** 오행 (木火土金水). DB의 public.five_element enum과 동일한 값 */
export type Element = "목" | "화" | "토" | "금" | "수";

/** 성명학 계산에 필요한 한자 한 글자 정보 (hanja_dict 행에서 변환) */
export interface HanjaChar {
  hanja: string;
  /** 한글 음 (예: 현) */
  eum: string;
  /** 원획 (수리 계산 기준) */
  strokes: number;
  /** 자원오행 (한자 자체의 오행). 사전에 없으면 null */
  element: Element | null;
}

export interface NamingInput {
  /** 성 (1자 단성 또는 2자 복성) */
  surname: HanjaChar[];
  /** 이름 (1자 외자 또는 2자) */
  givenName: HanjaChar[];
  /** 사주에서 구한 용신(보강이 필요한 오행). 있으면 자원오행 점수에 반영 */
  neededElement?: Element;
}

export type FourGyeokKey = "won" | "hyeong" | "i" | "jeong";

export interface GyeokResult {
  /** 격의 획수 합 (81 초과 시 환원 전 값) */
  raw: number;
  /** 1~81로 환원한 수리 */
  suri: number;
  lucky: boolean;
  /** 수리 오행 (획수 끝자리 기준) */
  element: Element;
}

export interface ElementFlow {
  elements: Element[];
  /** 인접한 오행 쌍의 관계 */
  relations: Relation[];
  /** 0~100 */
  score: number;
}

export type Relation = "생" | "비화" | "극" | "설";

export interface NamingAnalysis {
  fourGyeok: Record<FourGyeokKey, GyeokResult>;
  /** 발음오행 (성·이름 초성 기준) */
  pronunciation: ElementFlow;
  /** 자원오행 (한자 고유 오행). 사전에 오행 정보가 없는 글자가 있으면 null */
  resource: (ElementFlow & { needMatched: boolean | null }) | null;
  /** 100점 만점 종합 점수 */
  totalScore: number;
}
