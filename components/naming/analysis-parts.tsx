import { suriWebName } from "@/lib/naming/suri81";
import type { NamingAnalysis } from "@/lib/naming/types";

export { GradeBadge } from "@/components/naming/grade-badge";

/** 결과 화면·마이페이지에서 함께 쓰는 성명학 점수 표시 */

const GYEOK_LABEL = { won: "원격", hyeong: "형격", i: "이격", jeong: "정격" } as const;

const BREAKDOWN_LABEL: [keyof NamingAnalysis["breakdown"], string][] = [
  ["saju", "사주 보완"],
  ["suri", "수리"],
  ["pronunciation", "발음오행"],
  ["resource", "자원오행"],
];

/** 항목별 점수 (작게) */
export function ScoreBreakdownLine({ analysis }: { analysis: NamingAnalysis }) {
  return (
    <p className="text-xs text-muted-foreground">
      {BREAKDOWN_LABEL.map(([k, label]) => {
        const v = analysis.breakdown[k];
        return `${label} ${v === null ? "-" : Math.round(v)}`;
      }).join(" · ")}
    </p>
  );
}

/** 4격 한 칸: "33수 승천격 · 길" / "44수 · 흉" (격 이름은 길한 수만, 풀이는 PDF에만) */
export function gyeokText(g: { suri: number; lucky: boolean }): string {
  const name = suriWebName(g.suri);
  return `${g.suri}수${name ? ` ${name}` : ""} · ${g.lucky ? "길" : "흉"}`;
}

/** 원/형/이/정 4격 수리와 길흉 */
export function GyeokGrid({ analysis }: { analysis: NamingAnalysis }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
      {(Object.keys(GYEOK_LABEL) as (keyof typeof GYEOK_LABEL)[]).map((k) => (
        <p key={k}>
          <span className="text-muted-foreground">{GYEOK_LABEL[k]}</span> {gyeokText(analysis.fourGyeok[k])}
        </p>
      ))}
    </div>
  );
}
