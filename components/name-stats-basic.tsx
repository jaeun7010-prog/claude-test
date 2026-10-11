import { STATS_START_YEAR } from "@/lib/name-stats/constants";
import { formatAsOfDate } from "@/lib/name-stats/snapshot";
import type { NameStatSummary } from "@/lib/stats/name-stats";

/**
 * 이름 통계 기본 표기 한 줄: 이름 · 성별별 누적 건수 · 기준일.
 * 예) 서윤 · 여 38,000명 · 남 412명 · 2026년 10월 1일 기준 (2008년 이후 출생신고 누적)
 */
export function NameStatsBasic({
  stat,
  asOfDate,
  className = "",
}: {
  stat: NameStatSummary;
  asOfDate: string | null;
  className?: string;
}) {
  const { male, female } = stat.cumulative;
  const part = (label: string, n: number) =>
    n > 0 ? `${label} ${n.toLocaleString("ko-KR")}명` : `${label} 상위 목록 밖`;
  // 건수가 많은 성별을 앞에 둔다
  const counts =
    male + female === 0
      ? ["상위 목록에 없는 희귀한 이름"]
      : female >= male
        ? [part("여", female), part("남", male)]
        : [part("남", male), part("여", female)];
  const basis = `(${STATS_START_YEAR}년 이후 출생신고 누적)`;

  return (
    <p className={`text-sm ${className}`}>
      <span className="font-medium">{stat.name}</span>
      {" · "}
      {counts.join(" · ")}
      <span className="text-muted-foreground">
        {" · "}
        {asOfDate ? `${formatAsOfDate(asOfDate)} 기준 ${basis}` : basis}
      </span>
    </p>
  );
}
