import type { SupabaseClient } from "@supabase/supabase-js";

import type { NameStatsSource, SourceError } from "./sources/types";

export type IngestResult =
  | { ok: true; snapshotId: number; rowCount: number; years: number[] }
  | { ok: false; errors: SourceError[] };

/**
 * 수집 구현체의 결과를 name_stats 에 반영하고 data_snapshots 에 기록한다.
 * 오류가 하나라도 있으면 아무것도 반영하지 않는다. `supabase` 는 관리자 세션이어야 한다 (RLS).
 */
export async function ingestNameStats(
  supabase: SupabaseClient,
  source: NameStatsSource
): Promise<IngestResult> {
  const loaded = await source.load();
  if (!loaded.ok) return loaded;

  const { batch } = loaded;
  const { data, error } = await supabase.rpc("apply_name_stats_snapshot", {
    p_as_of_date: batch.asOfDate,
    p_source_name: batch.sourceName,
    p_rows: batch.rows,
  });
  if (error) {
    console.error(`[name-stats] 반영 실패 (${source.id})`, error);
    return { ok: false, errors: [{ message: `반영 실패: ${error.message}` }] };
  }
  return {
    ok: true,
    snapshotId: Number(data),
    rowCount: batch.rows.length,
    years: [...new Set(batch.rows.map((r) => r.year))].sort((a, b) => a - b),
  };
}
