"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { GradeBadge } from "@/components/naming/analysis-parts";
import { Button } from "@/components/ui/button";
import { COMPARE_MAX } from "@/lib/naming/compare";
import type { Grade } from "@/lib/naming/types";

export interface SavedListItem {
  id: string;
  name: string;
  hanja: string;
  grade: Grade | null;
  score: number | null;
  favorite: boolean;
  /** 부모 성 함께 쓰기의 출생신고 등록 안내 */
  registration: string | null;
  createdAt: string;
}

/** 마이페이지 저장 이름 목록: 행을 누르면 상세, 체크박스로 2~3개를 골라 나란히 비교 */
export function SavedList({ items }: { items: SavedListItem[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);
  const full = picked.length >= COMPARE_MAX;

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < COMPARE_MAX ? [...p, id] : p));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-secondary px-3 py-2 text-sm">
        <span className="text-muted-foreground">
          {picked.length === 0
            ? `비교할 이름을 2~${COMPARE_MAX}개 고르세요.`
            : `${picked.length}개 선택${full ? ` (최대 ${COMPARE_MAX}개)` : ""}`}
        </span>
        <div className="flex gap-2">
          {picked.length > 0 && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setPicked([])}>
              선택 해제
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            disabled={picked.length < 2}
            onClick={() => router.push(`/mypage/compare?ids=${picked.join(",")}`)}
          >
            나란히 비교하기
          </Button>
        </div>
      </div>

      <ul className="divide-y">
        {items.map((h) => {
          const checked = picked.includes(h.id);
          return (
            <li key={h.id} className="flex items-center gap-3">
              <input
                id={`pick-${h.id}`}
                type="checkbox"
                className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                checked={checked}
                disabled={!checked && full}
                onChange={() => toggle(h.id)}
                aria-label={`${h.name} 비교에 넣기`}
              />
              <Link
                href={`/mypage/names/${h.id}`}
                className="-mx-2 flex min-w-0 flex-1 items-center gap-4 rounded-md px-2 py-3 hover:bg-secondary"
              >
                {h.grade && h.score != null ? (
                  <GradeBadge grade={h.grade} score={h.score} size="sm" />
                ) : (
                  <span className="w-10 shrink-0 text-center text-xs text-muted-foreground">-</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-lg font-bold">
                    {h.name}
                    {h.favorite && " ★"}
                  </p>
                  {h.hanja && <p className="font-serif text-sm text-muted-foreground">{h.hanja}</p>}
                  {h.registration && <p className="text-xs text-muted-foreground">{h.registration}</p>}
                </div>
                <div className="shrink-0 text-right text-sm text-muted-foreground">
                  <p>{new Date(h.createdAt).toLocaleDateString("ko-KR")}</p>
                  <p className="text-primary">자세히 ›</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
