import { STATS_START_YEAR } from "./constants";
import type { NameStatsRow } from "./sources/types";

/** 기준일 형식(YYYY-MM-DD)과 범위 검증. 문제가 없으면 null */
export function validateAsOfDate(asOfDate: string, now = new Date()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) return "기준일을 YYYY-MM-DD 형식으로 입력해 주세요.";
  const d = new Date(`${asOfDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== asOfDate)
    return "기준일이 올바른 날짜가 아닙니다.";
  if (d.getUTCFullYear() < STATS_START_YEAR)
    return `기준일은 ${STATS_START_YEAR}년 이후여야 합니다.`;
  // 시간대 차이를 감안해 하루까지는 허용
  if (d.getTime() > now.getTime() + 24 * 60 * 60 * 1000) return "기준일은 미래일 수 없습니다.";
  return null;
}

/** 행 하나의 값 검증. 문제가 없으면 null. 모든 수집 구현체가 공통으로 사용한다 */
export function validateRow(row: NameStatsRow, maxYear: number): string | null {
  if (!/^[가-힣]{1,4}$/.test(row.name)) return `이름 형식 오류 '${row.name}' (성 제외 한글 1~4자)`;
  if (!Number.isInteger(row.year) || row.year < STATS_START_YEAR || row.year > maxYear)
    return `연도 오류 '${row.year}' (${STATS_START_YEAR}~${maxYear})`;
  if (!Number.isInteger(row.count) || row.count < 0) return `건수 오류 '${row.count}'`;
  return null;
}
