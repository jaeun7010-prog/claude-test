import Link from "next/link";

import { NameStatsBasic } from "@/components/name-stats-basic";
import { TierBadge } from "@/components/name-stats-chart";
import { CATEGORY_LABEL, NATIVE_SCORE_WEIGHTS } from "@/lib/naming/native/score";
import type { NativeCandidate } from "@/lib/naming/native/service";
import type { NameStatSummary } from "@/lib/stats/name-stats";

/** 순우리말 이름 카드 (서버에서 그려 ResultList에 넘긴다). 모두 무료라 잠금·리포트 버튼이 없고, 저장은 5단계에서 붙인다 */

const ITEM_LABEL = {
  yongsin: "용신 보완",
  flow: "발음오행 흐름",
  meaning: "뜻",
  easy: "부르기 쉬움",
} as const;

const ITEM_KEYS = Object.keys(ITEM_LABEL) as (keyof typeof ITEM_LABEL)[];

/** 우리말 이름 점수를 크게 (등급 없이 숫자만) */
function NativeScoreBadge({ total }: { total: number }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1" aria-label={`우리말 이름 점수 ${total.toFixed(1)}점`}>
      <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary font-serif text-xl font-bold text-primary">
        {Math.round(total)}
      </span>
      <span className="text-xs text-muted-foreground">우리말 점수</span>
    </div>
  );
}

export function NativeCardBody({
  candidate: c,
  surname,
  stat,
  statsLoaded,
  asOfDate,
}: {
  candidate: NativeCandidate;
  surname: string;
  /** 법적 이름 기준 출생 통계 (없으면 상위 목록 밖) */
  stat: NameStatSummary | undefined;
  /** 출생 통계가 적재되었는가 */
  statsLoaded: boolean;
  asOfDate: string | null;
}) {
  const s = c.score;
  const warnings = [s.teasing?.label, s.hardToSay].filter((w): w is string => !!w);
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-serif text-2xl font-bold break-keep">
            {surname}
            {c.legalName}
          </p>
          <span className="inline-block rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
            {CATEGORY_LABEL[c.name.category]}
          </span>
          <p className="text-sm break-keep">{c.name.meaning}</p>
        </div>
        <NativeScoreBadge total={s.total} />
      </div>

      {warnings.length > 0 && (
        <ul className="space-y-1">
          {warnings.map((w) => (
            <li key={w} className="rounded-md border border-dashed px-3 py-1.5 text-xs">
              ⚠ {w}
            </li>
          ))}
        </ul>
      )}

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ITEM_KEYS.map((k) => {
          const v = s.items[k].score;
          return (
            <div key={k} className="rounded-md bg-secondary px-3 py-2">
              <dt className="text-xs text-muted-foreground">
                {ITEM_LABEL[k]} <span className="whitespace-nowrap">({NATIVE_SCORE_WEIGHTS[k]}점 배점)</span>
              </dt>
              <dd className="text-base font-semibold">{v === null ? "-" : `${Math.round(v)}점`}</dd>
            </div>
          );
        })}
      </dl>
      {s.hardToSayPenalty > 0 && (
        <p className="text-xs text-muted-foreground">발음이 어려운 이름이라 총점에서 {s.hardToSayPenalty}점을 더 뺐습니다.</p>
      )}

      <p className="text-sm break-keep">
        <span className="text-muted-foreground">발음오행</span> {s.items.flow.note}
      </p>

      <details className="rounded-md border">
        <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-primary">
          항목별 설명 보기
        </summary>
        <ul className="space-y-1 border-t p-3 text-sm">
          <li className="break-keep">
            <span className="text-muted-foreground">용신 보완</span> {s.items.yongsin.note}
          </li>
          <li className="break-keep">
            <span className="text-muted-foreground">뜻</span> {s.items.meaning.note}
          </li>
          <li className="break-keep">
            <span className="text-muted-foreground">부르기 쉬움</span> {s.items.easy.note}
          </li>
          <li>
            <span className="text-muted-foreground">글로벌 발음</span> {c.globalScore}
          </li>
        </ul>
      </details>

      {stat ? (
        <div className="space-y-2 rounded-md border p-3">
          <NameStatsBasic stat={stat} asOfDate={asOfDate} />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-muted-foreground">희소성</span>
            <TierBadge tier={stat.tier} />
            {stat.neutral && <span className="text-muted-foreground">남녀 공용</span>}
            <Link href={`/stats?name=${encodeURIComponent(c.legalName)}`} className="ml-auto text-primary underline">
              연도별 상세 통계
            </Link>
          </div>
        </div>
      ) : (
        <p className="text-sm">
          <span className="text-muted-foreground">희소성</span>{" "}
          {statsLoaded ? "상위 출생신고 목록 밖 (매우 희귀)" : "출생 통계를 준비하고 있습니다"}
        </p>
      )}
    </>
  );
}
