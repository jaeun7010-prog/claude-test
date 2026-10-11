import { formatAsOfDate, getLatestSnapshot } from "@/lib/name-stats/snapshot";

/** 통계가 보이는 모든 화면에 붙이는 "기준일 + 출처" 표기. 반영된 통계가 없으면 표시하지 않는다 */
export async function DataSourceNote({ className = "" }: { className?: string }) {
  const snapshot = await getLatestSnapshot();
  if (!snapshot) return null;
  return (
    <p className={`text-xs text-muted-foreground ${className}`}>
      {formatAsOfDate(snapshot.asOfDate)} 기준 · 출처: {snapshot.sourceName} (출생신고 기준)
    </p>
  );
}
