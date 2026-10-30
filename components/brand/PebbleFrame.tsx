import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** 흰 카드 뒤에 조약돌 두 개를 놓는 장식 틀 (왼쪽 위 모래, 오른쪽 아래 하늘) */
export function PebbleFrame({ children, className, cardClassName }: { children: ReactNode; className?: string; cardClassName?: string }) {
  return (
    <div className={cn("relative isolate w-full px-6 py-9", className)}>
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 -z-10 h-[170px] w-[min(230px,60%)] bg-sand"
        style={{ borderRadius: "60% 40% 55% 45% / 55% 50% 50% 45%" }}
      />
      <span
        aria-hidden="true"
        className="absolute bottom-0 right-0 -z-10 h-[150px] w-[min(210px,55%)] bg-sky-pebble"
        style={{ borderRadius: "45% 55% 40% 60% / 50% 45% 55% 50%" }}
      />
      <div className={cn("rounded-3xl border bg-card p-6 shadow-pebble", cardClassName)}>{children}</div>
    </div>
  );
}
