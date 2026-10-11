import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export interface LatestSnapshot {
  /** 데이터 기준일 (YYYY-MM-DD) */
  asOfDate: string;
  sourceName: string;
}

/** "2026-10-01" → "2026년 10월 1일" */
export function formatAsOfDate(asOfDate: string) {
  const [y, m, d] = asOfDate.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

/** 가장 최근 기준일의 스냅샷. 아직 반영된 통계가 없으면 null (요청당 한 번만 조회) */
export const getLatestSnapshot = cache(async (): Promise<LatestSnapshot | null> => {
  const { data, error } = await createClient()
    .from("data_snapshot_latest")
    .select("as_of_date, source_name")
    .maybeSingle();
  if (error || !data) return null;
  return { asOfDate: String(data.as_of_date), sourceName: String(data.source_name) };
});
