"use client";

import { useEffect, useState } from "react";

/**
 * 이름을 만드는 동안 보여 주는 화면. 서버의 실제 진행 상태는 알 수 없어 단계를 순서대로 보여 주기만 하고,
 * 마지막 단계는 결과 화면이 뜰 때까지 "하는 중"으로 둔다.
 */

const STEPS = [
  { title: "사주 계산", now: "태어난 날과 시각으로 계산하는 중", done: "필요한 오행을 찾았어요" },
  { title: "어울리는 한자 찾기", now: "인명용 한자에서 찾는 중", done: "인명용 한자에서 골랐어요" },
  { title: "점수 매기기", now: "100점 기준으로 계산하는 중", done: "100점 기준으로 계산했어요" },
];
const STEP_MS = 1600;
const PROGRESS = ["34%", "67%", "90%"];
/** 폼의 화면에서 결과 화면의 loading.tsx로 넘어가도 단계가 처음으로 돌아가지 않게 시작 시각을 함께 쓴다 */
const SAME_WAIT_MS = 30_000;
let startedAt = 0;

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function SkeletonCard({ title, line }: { title: string; line: string }) {
  return (
    <div className="flex items-center gap-3.5 rounded-[18px] border bg-card p-4">
      <span className="h-12 w-12 rounded-2xl bg-sand-tint" />
      <span className="flex flex-1 flex-col gap-2">
        <span className={`h-3.5 rounded-md bg-sand-tint ${title}`} />
        <span className={`h-2.5 rounded-md bg-sand-tint ${line}`} />
      </span>
    </div>
  );
}

export function NamingWaiting({ summary }: { summary?: string | null }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (Date.now() - startedAt > SAME_WAIT_MS) startedAt = Date.now();
    const tick = () => setStep(Math.min(Math.floor((Date.now() - startedAt) / STEP_MS), STEPS.length - 1));
    tick();
    const t = setInterval(tick, 200);
    return () => clearInterval(t);
  }, []);

  return (
    <div role="status" className="mx-auto w-full max-w-md space-y-5 px-5 py-8">
      <div className="space-y-1.5">
        <p className="text-2xl font-extrabold">이름을 고르고 있어요</p>
        {summary && <p className="text-[15px] text-ink-soft break-keep">{summary}</p>}
      </div>

      <div
        role="progressbar"
        aria-label="진행 상황"
        aria-valuemin={0}
        aria-valuemax={STEPS.length}
        aria-valuenow={step + 1}
        className="h-2 rounded-full bg-line"
      >
        <div className="h-2 rounded-full bg-primary transition-[width] duration-500" style={{ width: PROGRESS[step] }} />
      </div>

      <ol className="space-y-4 rounded-3xl border bg-card p-5">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex items-start gap-3">
            {i < step ? (
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check />
              </span>
            ) : i === step ? (
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full border-[3px] border-sky">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
              </span>
            ) : (
              <span className="h-7 w-7 flex-none rounded-full border-2 border-input" />
            )}
            <span className="space-y-0.5 pt-0.5">
              <span className={`block font-extrabold ${i > step ? "text-muted-foreground" : ""}`}>{s.title}</span>
              <span className="block text-sm text-muted-foreground">{i < step ? s.done : i === step ? s.now : "기다리는 중"}</span>
            </span>
          </li>
        ))}
      </ol>

      <div aria-hidden="true" className="space-y-2.5">
        <SkeletonCard title="w-[55%]" line="w-[80%]" />
        <SkeletonCard title="w-[45%]" line="w-[70%]" />
      </div>

      <p className="rounded-2xl bg-sand-light px-4 py-3.5 text-sm text-ink-soft break-keep">
        <b className="text-sand-text">알고 계셨나요?</b> 같은 정씨도 <span className="font-serif">鄭</span>(19획)과{" "}
        <span className="font-serif">丁</span>(2획)은 획수가 달라서 어울리는 이름도 달라요.
      </p>

      <p className="text-center text-[15px] text-muted-foreground">잠시만 기다려 주세요</p>
    </div>
  );
}
