import { suriWebName } from "@/lib/naming/suri81";
import type { Grade, NamingAnalysis } from "@/lib/naming/types";

/** 결과 화면·마이페이지에서 함께 쓰는 성명학 점수 표시 */

const GYEOK_LABEL = { won: "원격", hyeong: "형격", i: "이격", jeong: "정격" } as const;

const GRADE_STYLE: Record<Grade, string> = {
  S: "border-primary bg-primary text-primary-foreground",
  A: "border-primary text-primary",
  B: "border-transparent bg-secondary text-foreground",
  C: "border-border text-muted-foreground",
};

/** 성명학 등급을 크게, 점수를 작게 */
export function GradeBadge({ grade, score, size = "lg" }: { grade: Grade; score: number; size?: "lg" | "sm" }) {
  const box = size === "lg" ? "h-14 w-14 text-3xl" : "h-10 w-10 text-xl";
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <span
        className={`flex items-center justify-center rounded-full border-2 font-serif font-bold ${box} ${GRADE_STYLE[grade]}`}
        aria-label={`성명학 ${grade}등급`}
      >
        {grade}
      </span>
      <span className="text-xs text-muted-foreground">{score.toFixed(1)}점</span>
    </div>
  );
}

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
