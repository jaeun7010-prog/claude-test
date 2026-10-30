import type { Grade } from "@/lib/naming/types";

/** 성명학 등급 배지. 엔진·유료 문구를 가져오지 않아 브라우저 컴포넌트(셀프 작명)에서도 쓴다 */

const GRADE_STYLE: Record<Grade, string> = {
  S: "border-primary bg-primary text-primary-foreground",
  A: "border-sky-light bg-sky-light text-sea-deep",
  B: "border-sand-light bg-sand-light text-sand-text",
  C: "border-border bg-card text-muted-foreground",
};

/** 성명학 등급과 점수를 한 칸에 함께 */
export function GradeBadge({ grade, score, size = "lg" }: { grade: Grade; score: number; size?: "lg" | "sm" }) {
  const box = size === "lg" ? "h-14 w-14 rounded-[18px] text-xl" : "h-12 w-12 rounded-2xl text-base";
  return (
    <span
      className={`flex shrink-0 flex-col items-center justify-center border font-bold leading-tight ${box} ${GRADE_STYLE[grade]}`}
      aria-label={`성명학 ${grade}등급 ${score.toFixed(1)}점`}
    >
      {grade}
      <span className="text-xs font-semibold leading-tight">{score.toFixed(1)}점</span>
    </span>
  );
}

/** 글자 안에 넣는 작은 등급 표시 (예: 목록 한 줄의 "A") */
export function GradeChip({ grade }: { grade: Grade }) {
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold ${GRADE_STYLE[grade]}`}
      aria-label={`${grade}등급`}
    >
      {grade}
    </span>
  );
}
