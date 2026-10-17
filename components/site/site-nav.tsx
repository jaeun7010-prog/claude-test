"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

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

  const items: Item[] = [
    { href: "/naming", label: "작명하기", match: ["/naming", "/goods"] },
    { href: "/stats", label: "이름 통계", match: ["/stats"] },
    loggedIn
      ? { href: "/mypage", label: "마이페이지", match: ["/mypage", "/orders"] }
      : { href: "/login", label: "로그인", match: ["/login", "/signup"] },
    ...(isAdmin ? [{ href: "/admin/name-stats", label: "관리자", match: ["/admin"] }] : []),
  ];
  const isActive = (it: Item) => it.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));

  const link = (it: Item, mobile: boolean) => {
    const active = isActive(it);
    return (
      <Link
        key={it.href}
        href={it.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "rounded-md text-sm transition-colors",
          mobile ? "block px-3 py-2" : "px-3 py-1.5",
          active ? "bg-secondary font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {it.label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4">
        <Link href="/" className="font-serif text-xl font-bold" aria-current={pathname === "/" ? "page" : undefined}>
          이름핏
        </Link>
        <nav aria-label="주요 메뉴" className="hidden items-center gap-1 sm:flex">
          {items.map((it) => link(it, false))}
        </nav>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-secondary sm:hidden"
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <nav id="mobile-menu" aria-label="주요 메뉴" className="space-y-1 border-t px-4 py-2 sm:hidden">
          {items.map((it) => link(it, true))}
        </nav>
      )}
    </header>
  );
}
