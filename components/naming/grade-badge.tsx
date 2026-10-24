import type { Grade } from "@/lib/naming/types";

/** 성명학 등급 배지. 엔진·유료 문구를 가져오지 않아 브라우저 컴포넌트(셀프 작명)에서도 쓴다 */

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

/** 글자 안에 넣는 작은 등급 표시 (예: 목록 한 줄의 "A") */
export function GradeChip({ grade }: { grade: Grade }) {
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full border font-serif text-xs font-bold ${GRADE_STYLE[grade]}`}
      aria-label={`${grade}등급`}
    >
      {grade}
    </span>
  );
}
