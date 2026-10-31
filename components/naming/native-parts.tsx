/* 순우리말 이름 배지 (결과 카드·마이페이지 목록·상세 공통). 마이페이지 목록은 클라이언트 컴포넌트라 엔진 코드를 import 하지 않는다 */

/** 우리말 이름 점수를 크게 (등급 없이 숫자만) */
export function NativeScoreBadge({ total, size = "lg" }: { total: number; size?: "lg" | "sm" }) {
  const box = size === "lg" ? "h-14 w-14 text-xl" : "h-10 w-10 text-base";
  return (
    <div className="flex shrink-0 flex-col items-center gap-1" aria-label={`우리말 이름 점수 ${total.toFixed(1)}점`}>
      <span
        className={`flex items-center justify-center rounded-full border-2 border-primary font-bold text-primary ${box}`}
      >
        {Math.round(total)}
      </span>
      <span className="whitespace-nowrap text-xs text-muted-foreground">{size === "lg" ? "우리말 점수" : "우리말"}</span>
    </div>
  );
}

/** 분류 배지 (사전에 있는 말 · 이름용으로 만든 말 · 널리 쓰이는 이름). label 은 score.ts 의 CATEGORY_LABEL */
export function NativeCategoryBadge({ label }: { label: string }) {
  return (
    <span className="inline-block rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
      {label}
    </span>
  );
}

