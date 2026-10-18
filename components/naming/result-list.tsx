"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";

import { savePriorities } from "@/app/naming/priorities-actions";
import { PriorityPanel } from "@/components/naming/priority-panel";
import { Card, CardContent } from "@/components/ui/card";
import {
  DEFAULT_PRIORITIES,
  badgesOf,
  rankByPriorities,
  parsePriorities,
  type NameMetrics,
  type Priorities,
  type SortKey,
} from "@/lib/naming/priorities";
import type { Grade } from "@/lib/naming/types";

export interface ResultItem {
  hangul: string;
  /** 한자 이름의 성명학 등급. 순우리말 이름은 등급을 쓰지 않아 비운다 */
  grade?: Grade;
  /** 점수와 관계없이 맨 뒤로 보낼 항목 (순우리말 강한 놀림말 이름) */
  demoted?: boolean;
  metrics: NameMetrics;
  /** 서버에서 그린 카드 본문 */
  body: ReactNode;
}

const STORAGE_KEY = "namefit:naming-priorities";

function readStored(): Priorities | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? parsePriorities(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeStored(p: Priorities) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 기억하지 않는다
  }
}

/**
 * 우선순위 선택 상태. 한자·순우리말 탭이 같은 선택을 함께 쓴다.
 * 로그인 사용자는 서버(profiles.naming_priorities)에, 비로그인은 이 브라우저에 기억한다.
 */
export function usePriorities({
  loggedIn,
  saved,
  sortOverride,
  rareAvailable,
}: {
  loggedIn: boolean;
  /** 로그인 사용자의 저장된 우선순위 (없으면 null) */
  saved: Priorities | null;
  /** 예전 링크의 희소성 값(rarity=rare/common)에서 이어받은 정렬 */
  sortOverride: SortKey | null;
  rareAvailable: boolean;
}) {
  const withOverride = (p: Priorities): Priorities => {
    const sort = sortOverride ?? p.sort;
    return { ...p, sort: !rareAvailable && sort !== "custom" ? "custom" : sort };
  };
  const [priorities, setPriorities] = useState<Priorities>(() =>
    withOverride(saved ?? DEFAULT_PRIORITIES)
  );
  const [status, setStatus] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const saveSeq = useRef(0);

  // 비로그인 사용자는 이 브라우저에 기억한 값을 불러온다
  useEffect(() => {
    if (loggedIn) return;
    const stored = readStored();
    if (stored) setPriorities(withOverride(stored));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const change = (next: Priorities) => {
    setPriorities(next);
    if (!loggedIn) {
      writeStored(next);
      setStatus("이 브라우저에 선택을 기억합니다. 로그인하면 다른 기기에서도 유지됩니다.");
      return;
    }
    const seq = ++saveSeq.current;
    startTransition(async () => {
      const res = await savePriorities(next);
      if (seq !== saveSeq.current) return; // 더 최근 변경이 있으면 그 결과만 알린다
      setStatus(res.ok ? "선택을 저장했습니다. 다음에도 이 기준으로 보여 드립니다." : "선택을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    });
  };

  return { priorities, change, status };
}

/** 우선순위 패널 (선택 상태는 usePriorities로 받는다) */
export function ResultPriorityPanel({
  state,
  rareAvailable,
}: {
  state: ReturnType<typeof usePriorities>;
  rareAvailable: boolean;
}) {
  return (
    <PriorityPanel value={state.priorities} onChange={state.change} rareAvailable={rareAvailable} status={state.status} />
  );
}

/**
 * 추천 이름 목록. 우선순위를 바꾸면 서버를 거치지 않고 맞춤 점수로 다시 정렬한다.
 * items 는 기본 순위 점수 순으로 넉넉히(표시 개수보다 많이) 받아, 맞춤 점수 상위 limit개를 보여 준다.
 * grade가 있는 항목(한자 이름)은 성명학 등급을 함께 보여 주고, demoted 항목은 맨 뒤로 보낸다.
 */
export function ResultList({
  items,
  limit,
  priorities,
  rareAvailable,
}: {
  items: ResultItem[];
  limit: number;
  priorities: Priorities;
  rareAvailable: boolean;
}) {
  const shown = useMemo(
    () => rankByPriorities(items, priorities, rareAvailable, limit, (item) => !!item.demoted),
    [items, priorities, rareAvailable, limit]
  );

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-2xl font-bold">추천 이름 {shown.length}개</h2>
      {shown.map(({ item, score }) => (
        <Card key={item.hangul}>
          <CardContent className="space-y-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="font-medium">
                {item.grade && `성명학 ${item.grade}등급 · `}내 기준 맞춤 {Math.round(score)}점
              </span>
              {badgesOf(item.metrics, priorities, rareAvailable).map((b) => (
                <span key={b} className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                  {b}
                </span>
              ))}
            </div>
            {item.body}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
