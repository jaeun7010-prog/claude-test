export type Gender = "male" | "female";

/** 이름(성 제외) · 연도 · 성별별 출생신고 건수 한 행 (전국 기준) */
export interface NameStatsRow {
  name: string;
  year: number;
  gender: Gender;
  count: number;
}

export interface NameStatsBatch {
  /** 데이터 기준일 (YYYY-MM-DD) */
  asOfDate: string;
  sourceName: string;
  /** 포함된 연도는 그 연도의 전체 목록이어야 한다 (반영 시 연도 단위로 교체됨) */
  rows: NameStatsRow[];
}

export interface SourceError {
  /** 원본에서의 행 번호 (알 수 있는 경우) */
  line?: number;
  message: string;
}

export type NameStatsSourceResult =
  | { ok: true; batch: NameStatsBatch }
  | { ok: false; errors: SourceError[] };

/**
 * 이름 통계를 가져오는 방법. 구현체는 검증까지 마친 행 목록 또는 오류 목록을 돌려준다.
 * 반영(lib/name-stats/ingest.ts)과 화면은 이 인터페이스만 알기 때문에,
 * 수집 방식이 바뀌어도 구현체만 추가하면 된다.
 */
export interface NameStatsSource {
  readonly id: string;
  load(): Promise<NameStatsSourceResult>;
}
