"use client";

import {
  LEVEL_LABEL,
  PRIORITY_LABEL,
  SORT_LABEL,
  type Priorities,
  type PriorityKey,
  type PriorityLevel,
  type SortKey,
} from "@/lib/naming/priorities";

const LEVELS: PriorityLevel[] = ["normal", "important", "very"];
const KEYS: PriorityKey[] = ["rare", "global"];
const SORTS: SortKey[] = ["custom", "rare", "popular"];

const HINT: Record<PriorityKey, string> = {
  rare: "대법원 출생신고 누적 건수가 적을수록 가점 (상위 목록 밖 이름은 매우 희귀)",
  global: "영어권에서 읽고 발음하기 쉬울수록 가점",
};

const selectClass =
  "flex h-11 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function PriorityPanel({
  value,
  onChange,
  rareAvailable,
  status,
}: {
  value: Priorities;
  onChange: (next: Priorities) => void;
  /** 출생 통계가 적재되어 희귀 항목·희귀/인기 정렬을 쓸 수 있는가 */
  rareAvailable: boolean;
  /** 저장 상태 안내 문구 */
  status: string | null;
}) {
  // 기본값이 아니면 고른 내용이 보이도록 펼쳐서 시작한다
  const changed = value.rare !== "normal" || value.global !== "normal" || value.sort !== "custom";
  return (
    <details className="rounded-3xl border bg-card shadow-sm" open={changed || undefined}>
      <summary className="cursor-pointer select-none px-5 py-3 text-[15px] font-bold">우리 집이 중요하게 보는 것</summary>
      <div className="space-y-4 border-t p-5">
        <p className="text-sm text-muted-foreground break-keep">
          고른 항목에 가점을 더한 &quot;맞춤 점수&quot;로 순서를 바꿉니다. 성명학 등급·우리말 이름 점수와 리포트
          점수는 바뀌지 않습니다.
        </p>
        {KEYS.map((key) => {
          const disabled = key === "rare" && !rareAvailable;
          return (
            <div key={key} className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium" id={`priority-${key}`}>
                  {PRIORITY_LABEL[key]}
                </span>
                <div role="group" aria-labelledby={`priority-${key}`} className="flex flex-wrap gap-1.5">
                  {LEVELS.map((level) => {
                    const active = value[key] === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        disabled={disabled}
                        aria-pressed={active}
                        onClick={() => onChange({ ...value, [key]: level })}
                        className={`h-11 rounded-full border px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                          active ? "border-ink bg-ink text-cream" : "border-input bg-card hover:bg-secondary"
                        }`}
                      >
                        {LEVEL_LABEL[level]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {disabled ? "출생 통계 데이터가 아직 적재되지 않아 사용할 수 없습니다." : HINT[key]}
              </p>
            </div>
          );
        })}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <label htmlFor="priority-sort" className="text-sm font-medium">
            정렬
          </label>
          <select
            id="priority-sort"
            className={selectClass}
            value={value.sort}
            onChange={(e) => onChange({ ...value, sort: e.target.value as SortKey })}
          >
            {SORTS.map((s) => (
              <option key={s} value={s} disabled={s !== "custom" && !rareAvailable}>
                {SORT_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        {status && (
          <p role="status" className="text-xs text-muted-foreground">
            {status}
          </p>
        )}
      </div>
    </details>
  );
}
