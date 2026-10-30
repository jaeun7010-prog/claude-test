import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const TONE = {
  sand: { outer: "bg-sand p-3", inner: "bg-sand-tint" },
  sky: { outer: "bg-sky p-2.5", inner: "bg-sky-tint" },
} as const;

/** 이름 액자: 바깥은 테두리 색, 안쪽은 밝은 색. 돌·백일 이름 카드와 리포트 이름 칸에 쓴다 */
export function NameCardFrame({
  children,
  tone = "sand",
  className,
  innerClassName,
}: {
  children: ReactNode;
  tone?: keyof typeof TONE;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div className={cn("rounded-[28px]", TONE[tone].outer, className)}>
      <div className={cn("rounded-[18px] p-5", TONE[tone].inner, innerClassName)}>{children}</div>
    </div>
  );
}
