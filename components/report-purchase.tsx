"use client";

import Link from "next/link";
import { useState } from "react";

import { NameCardFrame } from "@/components/brand/NameCardFrame";
import { NameWithHanja } from "@/components/brand/NameWithHanja";
import { GradeBadge } from "@/components/naming/grade-badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/modal";
import { useCheckout } from "@/components/use-checkout";
import { REPORT_PRICE, won } from "@/lib/commerce/catalog";
import type { Grade } from "@/lib/naming/types";

/** 리포트에 실제로 들어가는 내용만 적는다 (report-document.tsx) */
const REPORT_EXTRAS = [
  { title: "81수 4격 풀이 전체", sub: "원격·형격·이격·정격이 각각 무슨 뜻인지" },
  { title: "한자 하나하나의 뜻과 오행", sub: "글자 풀이, 획수, 자원 오행까지" },
  { title: "사주를 어떻게 채우는지", sub: "왜 그 기운이 필요한지, 격국과 합·충·형의 근거" },
];

function Tick() {
  return (
    <svg className="size-[18px] shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function ReportPurchase({
  qs,
  gh,
  ge,
  hid,
  reportOrderId,
  fullName,
  fullHanja,
  grade,
  score,
  hasStats,
  backHref,
  backLabel,
  loginHref,
  loggedIn,
}: {
  qs: string;
  gh: string;
  ge: string;
  hid?: string;
  /** 이 이름의 리포트를 이미 결제했으면 그 주문 id (결제 버튼 대신 리포트 보기) */
  reportOrderId: string | null;
  fullName: string;
  fullHanja: string;
  grade: Grade;
  score: number;
  /** 출생 통계가 있을 때만 "이름이 얼마나 흔한지"를 무료 항목에 적는다 */
  hasStats: boolean;
  /** 무료 결과로 돌아가는 주소 */
  backHref: string;
  backLabel: string;
  loginHref: string;
  loggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { pay, busy, error, clearError } = useCheckout({
    onPaymentWindow: () => setOpen(false),
    onPaymentFailed: () => setOpen(true),
  });

  const freeItems = ["필요한 오행 분석", "네 가지 점수와 등급", hasStats ? "이름이 얼마나 흔한지" : "이름 뜻 한 줄"];
  return (
    <section aria-label="상세 리포트 안내" className="space-y-4">
      <NameCardFrame innerClassName="flex items-center justify-between gap-3">
        <NameWithHanja name={fullName} hanja={fullHanja} nameSize={32} hanjaSize={16} />
        <GradeBadge grade={grade} score={score} />
      </NameCardFrame>

      <div className="space-y-2.5 rounded-3xl border bg-card p-5">
        <h2 className="font-extrabold">이미 무료로 받은 것</h2>
        <ul className="space-y-2 text-[15px]">
          {freeItems.map((t) => (
            <li key={t} className="flex items-center gap-2">
              <Tick />
              {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-extrabold">리포트에 더 들어가는 것</h2>
        <ul className="space-y-2.5">
          {REPORT_EXTRAS.map((x) => (
            <li key={x.title} className="rounded-2xl border bg-card px-4 py-3.5 text-[15px]">
              <b>{x.title}</b>
              <span className="block text-sm text-muted-foreground break-keep">{x.sub}</span>
            </li>
          ))}
        </ul>
      </div>

      <ul className="space-y-2 rounded-3xl bg-sky-light p-5 text-sm">
        <li className="flex gap-2">
          <Tick />
          받은 날의 내용 그대로 보관돼요
        </li>
        <li className="flex gap-2">
          <Tick />
          같은 아이, 같은 이름이면 다시 결제하지 않아요
        </li>
      </ul>

      <div className="space-y-1.5 border-t pt-4">
        {reportOrderId ? (
          <>
            <p className="px-1 pb-1 text-[15px] font-bold text-primary">이미 받은 리포트예요</p>
            <Button asChild size="lg" className="w-full">
              <Link href={`/report/${reportOrderId}?download=1`}>PDF 받기</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link href={`/report/${reportOrderId}`}>리포트 보기</Link>
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-baseline justify-between px-1 pb-1.5">
              <span className="text-[15px] font-bold">상세 리포트 PDF</span>
              <span className="text-2xl font-extrabold">{won(REPORT_PRICE)}</span>
            </div>
            {loggedIn ? (
              <Button size="lg" className="w-full" onClick={() => setOpen(true)}>
                리포트 받기
              </Button>
            ) : (
              <Button asChild size="lg" className="w-full">
                <Link href={loginHref}>로그인하고 리포트 받기</Link>
              </Button>
            )}
            <Button asChild variant="ghost" className="w-full">
              <Link href={backHref}>{backLabel}</Link>
            </Button>
            {/* TODO: 환불 기준 화면이 생기면 링크로 바꾼다 */}
            <p className="text-center text-xs text-muted-foreground">환불 기준은 준비 중이에요</p>
          </>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          clearError();
        }}
        title="상세 리포트 결제"
      >
        <dl className="space-y-1 rounded-md bg-secondary p-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">상품</dt>
            <dd>상세 리포트 PDF</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">이름</dt>
            <dd className="font-serif">{fullName}</dd>
          </div>
          <div className="flex justify-between font-bold">
            <dt>결제 금액</dt>
            <dd>{won(REPORT_PRICE)}</dd>
          </div>
        </dl>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            닫기
          </Button>
          <Button onClick={() => pay({ kind: "report", qs, gh, ge, hid })} disabled={busy}>
            {busy ? "결제 진행 중…" : `${won(REPORT_PRICE)} 결제`}
          </Button>
        </div>
      </Modal>
    </section>
  );
}
