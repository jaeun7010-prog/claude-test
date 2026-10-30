"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { Logo } from "@/components/brand/LogoMark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** 메뉴를 넣지 않는 화면 (PDF 리포트처럼 문서만 보여야 하는 곳) */
const HIDDEN_PREFIXES = ["/report/"];

interface Item {
  href: string;
  label: string;
  /** 이 경로로 시작하면 현재 메뉴로 강조 */
  match: string[];
}

export function SiteNav({ loggedIn, isAdmin }: { loggedIn: boolean; isAdmin: boolean }) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);

  // 다른 페이지로 이동하면 휴대폰 메뉴를 닫는다
  useEffect(() => setOpen(false), [pathname]);

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  // 첫 화면은 구역 메뉴와 "무료로 시작" 버튼을 보여 준다
  const home = pathname === "/";
  const account: Item[] = [
    loggedIn
      ? { href: "/mypage", label: "마이페이지", match: ["/mypage", "/orders"] }
      : { href: "/login", label: "로그인", match: ["/login", "/signup"] },
    ...(isAdmin ? [{ href: "/admin/name-stats", label: "관리자", match: ["/admin"] }] : []),
  ];
  const items: Item[] = home
    ? [
        { href: "#why", label: "왜 이름핏", match: [] },
        { href: "#stats", label: "이름 통계", match: [] },
        { href: "#free", label: "무료 범위", match: [] },
        { href: "#sources", label: "점수와 출처", match: [] },
        ...account,
      ]
    : [
        { href: "/naming", label: "작명하기", match: ["/naming", "/goods"] },
        { href: "/stats", label: "이름 통계", match: ["/stats"] },
        ...account,
      ];
  const isActive = (it: Item) => it.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));

  const link = (it: Item, mobile: boolean) => {
    const active = isActive(it);
    return (
      <Link
        key={it.href}
        href={it.href}
        aria-current={active ? "page" : undefined}
        // 같은 화면 안 구역으로 옮겨 갈 때는 주소 경로가 그대로라 직접 닫는다
        onClick={() => setOpen(false)}
        className={cn(
          "rounded-md text-sm transition-colors",
          mobile ? "flex min-h-11 items-center px-3" : "inline-flex h-11 items-center px-3",
          active ? "bg-secondary font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {it.label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className={cn("mx-auto flex h-14 items-center justify-between gap-4 px-4", home ? "max-w-[1120px] sm:px-6" : "max-w-4xl")}>
        <Link href="/" className="flex h-11 items-center" aria-current={home ? "page" : undefined}>
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <nav aria-label="주요 메뉴" className={cn("hidden items-center gap-1", home ? "md:flex" : "sm:flex")}>
            {items.map((it) => link(it, false))}
          </nav>
          {home && (
            <Button asChild size="sm" className="ml-1 px-4 font-bold">
              <Link href="/naming">무료로 시작</Link>
            </Button>
          )}
          <button
            type="button"
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-secondary",
              home ? "md:hidden" : "sm:hidden"
            )}
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-menu"
          aria-label="주요 메뉴"
          className={cn("space-y-1 border-t px-4 py-2", home ? "md:hidden" : "sm:hidden")}
        >
          {items.map((it) => link(it, true))}
        </nav>
      )}
    </header>
  );
}
