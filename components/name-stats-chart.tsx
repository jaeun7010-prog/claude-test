import type { NameStatSummary } from "@/lib/stats/name-stats";

const W = 640;
const H = 200;
const PAD = { top: 12, right: 8, bottom: 26, left: 40 };

/** 보기 좋은 눈금 상한 (1, 2, 5 × 10^n) */
function niceMax(v: number) {
  if (v <= 0) return 10;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

/**
 * 연도별 출생 인원 막대 차트 (서버 렌더링 SVG).
 * 목록에 없는 연도는 0이 아니라 "상한 미만"이므로 점선 막대로 구분한다.
 */
export function YearlyCountChart({ stat }: { stat: NameStatSummary }) {
  const { series } = stat;
  if (series.length === 0) return null;

  const dataMax = Math.max(1, ...series.map((p) => (p.listed ? p.total : (p.upperBound ?? 0))));
  const max = niceMax(dataMax);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / series.length;
  const barW = Math.min(28, Math.max(6, slot - 4));
  const y = (v: number) => PAD.top + innerH * (1 - v / max);
  const ticks = [0, max / 2, max];
  const labelEvery = series.length > 12 ? 2 : 1;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${stat.name} 연도별 출생 인원`}
      className="h-auto w-full"
    >
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(t)}
            y2={y(t)}
            stroke="hsl(var(--border))"
            strokeWidth={1}
          />
          <text
            x={PAD.left - 6}
            y={y(t) + 4}
            textAnchor="end"
            fontSize={11}
            fill="hsl(var(--muted-foreground))"
          >
            {t.toLocaleString("ko-KR")}
          </text>
        </g>
      ))}

      {series.map((p, i) => {
        const x = PAD.left + slot * i + (slot - barW) / 2;
        const v = p.listed ? p.total : (p.upperBound ?? 0);
        const top = y(v);
        const h = Math.max(0, PAD.top + innerH - top);
        const tip = p.listed
          ? `${p.year}년 ${p.total.toLocaleString("ko-KR")}명 (남 ${p.male.toLocaleString("ko-KR")} · 여 ${p.female.toLocaleString("ko-KR")})`
          : p.upperBound !== null
            ? `${p.year}년 상위 목록 밖 (${p.upperBound.toLocaleString("ko-KR")}명 미만)`
            : `${p.year}년 데이터 없음`;
        return (
          <g key={p.year}>
            <title>{tip}</title>
            {/* 호버/터치 영역: 막대보다 넓게 */}
            <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={innerH} fill="transparent" />
            {p.listed ? (
              <path
                d={`M${x},${PAD.top + innerH} V${top + 4} a4,4 0 0 1 4,-4 h${barW - 8} a4,4 0 0 1 4,4 V${PAD.top + innerH} Z`}
                fill="hsl(var(--primary))"
              />
            ) : (
              <rect
                x={x + 0.75}
                y={top}
                width={barW - 1.5}
                height={h}
                fill="none"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
            )}
            {i % labelEvery === 0 && (
              <text
                x={x + barW / 2}
                y={H - 8}
                textAnchor="middle"
                fontSize={11}
                fill="hsl(var(--muted-foreground))"
              >
                {String(p.year).slice(2)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** 최근 연도 합계 기준 성비 (100% 누적 막대 한 줄 + 직접 라벨) */
export function GenderRatioBar({ stat }: { stat: NameStatSummary }) {
  if (stat.maleRatio === null) {
    return <p className="text-sm text-muted-foreground">최근 연도 성비 데이터가 없습니다.</p>;
  }
  const male = Math.round(stat.maleRatio * 100);
  const female = 100 - male;
  return (
    <div>
      <div
        className="flex h-6 w-full overflow-hidden rounded-md"
        role="img"
        aria-label={`남아 ${male}%, 여아 ${female}%`}
      >
        <div style={{ width: `${male}%`, background: "var(--chart-male)", marginRight: 2 }} />
        <div style={{ width: `${female}%`, background: "var(--chart-female)" }} />
      </div>
      <div className="mt-2 flex justify-between text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--chart-male)" }} />
          남아 {male}%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--chart-female)" }} />
          여아 {female}%
        </span>
      </div>
    </div>
  );
}

/** 접근성/정확한 수치 확인용 표 */
export function StatsTable({ stat }: { stat: NameStatSummary }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-muted-foreground">
          <th className="py-1 font-medium">연도</th>
          <th className="py-1 text-right font-medium">전체</th>
          <th className="py-1 text-right font-medium">남</th>
          <th className="py-1 text-right font-medium">여</th>
        </tr>
      </thead>
      <tbody>
        {stat.series.map((p) => (
          <tr key={p.year} className="border-t">
            <td className="py-1">{p.year}</td>
            {p.listed ? (
              <>
                <td className="py-1 text-right">{p.total.toLocaleString("ko-KR")}</td>
                <td className="py-1 text-right">{p.male.toLocaleString("ko-KR")}</td>
                <td className="py-1 text-right">{p.female.toLocaleString("ko-KR")}</td>
              </>
            ) : (
              <td colSpan={3} className="py-1 text-right text-muted-foreground">
                {p.upperBound !== null
                  ? `목록 밖 (${p.upperBound.toLocaleString("ko-KR")}명 미만)`
                  : "데이터 없음"}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const TIER_STYLE: Record<string, string> = {
  흔함: "bg-secondary text-secondary-foreground",
  보통: "bg-secondary text-secondary-foreground",
  드묾: "bg-primary text-primary-foreground",
  "매우 드묾": "bg-primary text-primary-foreground",
};

export function TierBadge({ tier }: { tier: NameStatSummary["tier"] }) {
  if (!tier) return null;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TIER_STYLE[tier]}`}>
      {tier}
    </span>
  );
}

/** 이름 하나의 통계 상세 (차트 + 성비 + 표) */
export function NameStatsDetail({ stat }: { stat: NameStatSummary }) {
  const { latest } = stat;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <TierBadge tier={stat.tier} />
        {latest && (
          <span>
            {latest.year}년{" "}
            {latest.listed
              ? `${latest.total.toLocaleString("ko-KR")}명`
              : `상위 목록 밖 (${latest.upperBound?.toLocaleString("ko-KR") ?? "?"}명 미만)`}
          </span>
        )}
        {stat.neutral && <span className="text-muted-foreground">젠더 뉴트럴 이름</span>}
      </div>
      {stat.everListed ? (
        <>
          <YearlyCountChart stat={stat} />
          <GenderRatioBar stat={stat} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          통계 목록에 오른 적이 없습니다. 연도별 목록의 최소 인원(
          {latest?.upperBound?.toLocaleString("ko-KR") ?? "?"}명) 미만이며, 0명이라는 뜻은 아닙니다.
        </p>
      )}
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">수치 표로 보기</summary>
        <div className="mt-2">
          <StatsTable stat={stat} />
        </div>
      </details>
    </div>
  );
}
