import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * 결제 전 유료 내용 자리. 실제 내용은 서버에서 그리지 않고, 모양만 비슷한 가짜 문장을 흐리게 보여 준다
 * (lib/commerce/entitlement.ts).
 */
const FAKE_LINES = [
  "목 ○○% · 화 ○○% · 토 ○○% · 금 ○○% · 수 ○○%로 기운이 나뉘어 있습니다.",
  "태어난 달의 기운과 천간에 드러난 글자를 함께 보아 필요한 기운을 정했습니다.",
  "기운끼리의 관계를 반영하면 비율이 조금 달라지며, 그 근거는 다음과 같습니다.",
  "이름 글자의 소리와 뜻의 오행이 성에서 이름으로 이어지는 흐름을 살폈습니다.",
];

export function LockedPreview({
  what,
  href,
  label = "프리미엄 리포트로 보기",
  size = "block",
}: {
  /** 가려진 내용 이름 (예: 오행 비율 · 용신을 고른 이유) */
  what: string;
  href: string;
  label?: string;
  /** block: 여러 줄 (사주 카드) / inline: 한 줄 (이름 카드) */
  size?: "block" | "inline";
}) {
  if (size === "inline") {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-secondary/60 px-3 py-2 text-sm">
        <span aria-hidden className="select-none text-muted-foreground blur-[3px]">
          {FAKE_LINES[3]}
        </span>
        <span className="text-xs text-muted-foreground">{what}</span>
        <Link href={href} className="ml-auto inline-flex min-h-11 items-center text-xs font-medium text-primary underline-offset-4 hover:underline">
          {label} ›
        </Link>
      </div>
    );
  }
  return (
    <div className="relative overflow-hidden rounded-md border">
      <div aria-hidden className="select-none space-y-1 p-4 text-sm text-muted-foreground blur-[3px]">
        {FAKE_LINES.slice(0, 3).map((t) => (
          <p key={t}>{t}</p>
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/50 p-3 text-center">
        <p className="text-xs font-medium">{what}</p>
        <Button asChild size="sm" variant="secondary">
          <Link href={href}>{label}</Link>
        </Button>
      </div>
    </div>
  );
}
