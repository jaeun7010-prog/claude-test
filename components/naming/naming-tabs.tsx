"use client";

import { useState, type ReactNode } from "react";

import { ResultList, ResultPriorityPanel, usePriorities, type ResultItem } from "@/components/naming/result-list";
import type { Priorities, SortKey } from "@/lib/naming/priorities";

export type NamingTab = "hanja" | "native";

export interface TabContent {
  items: ResultItem[];
  limit: number;
  /** 목록 위 안내 (점수 설명, 출처 등) */
  intro: ReactNode;
  /** 후보가 없을 때 보여 줄 내용 */
  empty: ReactNode;
  /** 목록 아래 안내 (리포트 등) */
  outro?: ReactNode;
}

const TAB_LABEL: Record<NamingTab, string> = { hanja: "한자 이름", native: "순우리말 이름" };
const TABS: NamingTab[] = ["hanja", "native"];

/**
 * 결과 화면의 한자 이름 / 순우리말 이름 탭. 두 탭의 카드는 서버에서 함께 그려 받고, 탭은 브라우저에서 바꾼다.
 * 바꾼 탭은 주소의 `tab`에 남겨 새로 고침·공유해도 같은 탭이 열린다. 우선순위 선택은 두 탭이 함께 쓴다.
 */
export function NamingTabs({
  initialTab,
  hanja,
  native,
  loggedIn,
  saved,
  sortOverride,
  rareAvailable,
}: {
  initialTab: NamingTab;
  hanja: TabContent;
  native: TabContent;
  loggedIn: boolean;
  saved: Priorities | null;
  sortOverride: SortKey | null;
  rareAvailable: boolean;
}) {
  const [tab, setTab] = useState<NamingTab>(initialTab);
  const priorities = usePriorities({ loggedIn, saved, sortOverride, rareAvailable });

  const select = (next: NamingTab) => {
    setTab(next);
    try {
      const url = new URL(window.location.href);
      if (next === "hanja") url.searchParams.delete("tab");
      else url.searchParams.set("tab", next);
      window.history.replaceState(window.history.state, "", url);
    } catch {
      // 주소를 바꿀 수 없어도 탭 전환은 그대로 된다
    }
  };

  const content: Record<NamingTab, TabContent> = { hanja, native };

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="이름 종류" className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              id={`tab-${t}`}
              aria-selected={active}
              aria-controls={`panel-${t}`}
              onClick={() => select(t)}
              className={`h-11 rounded-full border px-4 text-[15px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                active ? "border-ink bg-ink text-cream" : "border-input bg-card text-foreground hover:bg-secondary"
              }`}
            >
              {TAB_LABEL[t]} {Math.min(content[t].items.length, content[t].limit)}
            </button>
          );
        })}
      </div>

      <ResultPriorityPanel state={priorities} rareAvailable={rareAvailable} />

      {TABS.map((t) => {
        const c = content[t];
        return (
          <div
            key={t}
            role="tabpanel"
            id={`panel-${t}`}
            aria-labelledby={`tab-${t}`}
            hidden={tab !== t}
            className="space-y-4"
          >
            {c.items.length === 0 ? (
              c.empty
            ) : (
              <>
                {c.intro}
                <ResultList
                  items={c.items}
                  limit={c.limit}
                  priorities={priorities.priorities}
                  rareAvailable={rareAvailable}
                />
                {c.outro}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
