"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { deleteSavedMany } from "@/app/mypage/actions";
import { deleteConfirmText } from "@/components/mypage/delete-saved-button";
import { GradeBadge } from "@/components/naming/analysis-parts";
import { NativeScoreBadge } from "@/components/naming/native-parts";
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
  /** 순우리말 이름: 우리말 이름 점수와 "분류 · 뜻" 한 줄 (한자 이름이면 null) */
  native: { score: number; line: string } | null;
  /** 직접 짓기(셀프 작명)로 저장한 이름 */
  self: boolean;
  createdAt: string;
  /** 이 이름의 프리미엄 리포트를 결제했는지 */
  reportPurchased: boolean;
}

/**
 * 마이페이지 저장 이름 목록: 행을 누르면 상세, 체크박스로 2~3개를 골라 나란히 비교하거나 여러 개를 한꺼번에 삭제.
 * 삭제는 확인을 받은 뒤 서버 액션으로 하고, 결제한 주문은 남는다 (deleteSavedMany)
 */
export function SavedList({ items }: { items: SavedListItem[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const canCompare = picked.length >= 2 && picked.length <= COMPARE_MAX;

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const remove = (ids: string[]) => {
    const names = items.filter((h) => ids.includes(h.id)).map((h) => h.name);
    if (names.length === 0 || !window.confirm(deleteConfirmText(names))) return;
    setDeleteError(null);
    startDelete(async () => {
      const r = await deleteSavedMany(ids);
      if (!r.ok) {
        setDeleteError(r.error);
        return;
      }
      setPicked((p) => p.filter((id) => !ids.includes(id)));
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-secondary px-3 py-2 text-sm">
        <span className="text-muted-foreground">
          {picked.length === 0
            ? `이름을 골라 비교(2~${COMPARE_MAX}개)하거나 삭제하세요.`
            : `${picked.length}개 선택${picked.length > COMPARE_MAX ? ` · 비교는 ${COMPARE_MAX}개까지` : ""}`}
        </span>
        <div className="flex flex-wrap gap-2">
          {picked.length > 0 && (
            <>
              <Button type="button" size="sm" variant="ghost" onClick={() => setPicked([])} disabled={deleting}>
                선택 해제
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-destructive"
                onClick={() => remove(picked)}
                disabled={deleting}
              >
                {deleting ? "삭제 중…" : `선택 삭제 (${picked.length})`}
              </Button>
            </>
          )}
          <Button
            type="button"
            size="sm"
            disabled={!canCompare || deleting}
            onClick={() => router.push(`/mypage/compare?ids=${picked.join(",")}`)}
          >
            나란히 비교하기
          </Button>
        </div>
      </div>
      {deleteError && (
        <p role="alert" className="text-sm text-destructive">
          {deleteError}
        </p>
      )}

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
                onChange={() => toggle(h.id)}
                aria-label={`${h.name} 선택`}
              />
              <Link
                href={`/mypage/names/${h.id}`}
                className="-mx-2 flex min-w-0 flex-1 items-center gap-4 rounded-md px-2 py-3 hover:bg-secondary"
              >
                {h.native ? (
                  <NativeScoreBadge total={h.native.score} size="sm" />
                ) : h.grade && h.score != null ? (
                  <GradeBadge grade={h.grade} score={h.score} size="sm" />
                ) : (
                  <span className="w-10 shrink-0 text-center text-xs text-muted-foreground">-</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-lg font-bold break-keep">
                    {h.name}
                    {h.favorite && " ★"}
                    {h.self && (
                      <span className="ml-2 inline-block rounded-full border px-2 py-0.5 align-middle font-sans text-xs font-medium text-muted-foreground">
                        직접 지음
                      </span>
                    )}
                    {h.reportPurchased && (
                      <span className="ml-2 inline-block rounded-full bg-primary px-2 py-0.5 align-middle font-sans text-xs font-medium text-primary-foreground">
                        리포트 구매
                      </span>
                    )}
                  </p>
                  {h.hanja && <p className="font-serif text-sm text-muted-foreground">{h.hanja}</p>}
                  {h.native && <p className="line-clamp-2 text-xs text-muted-foreground break-keep">{h.native.line}</p>}
                  {h.registration && <p className="text-xs text-muted-foreground">{h.registration}</p>}
                </div>
                <div className="shrink-0 text-right text-sm text-muted-foreground">
                  <p>{new Date(h.createdAt).toLocaleDateString("ko-KR")}</p>
                  <p className="text-primary">자세히 ›</p>
                </div>
              </Link>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => remove([h.id])}
                disabled={deleting}
                aria-label={`${h.name} 삭제`}
                title="삭제"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
