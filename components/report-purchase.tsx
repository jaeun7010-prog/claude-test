"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/modal";
import { useCheckout } from "@/components/use-checkout";
import { REPORT_PRICE, won } from "@/lib/commerce/catalog";

export function ReportPurchase({
  qs,
  gh,
  ge,
  hid,
  reportOrderId,
  fullName,
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
  loginHref: string;
  loggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { pay, busy, error, clearError } = useCheckout({
    onPaymentWindow: () => setOpen(false),
    onPaymentFailed: () => setOpen(true),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>프리미엄 PDF 리포트</CardTitle>
        <CardDescription>
          양가 어르신께 드리는 한문 작명 리포트 · {fullName} · {won(REPORT_PRICE)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <ul className="list-inside list-disc text-muted-foreground">
          <li>사주 원국과 용신 풀이, 4격 수리 81수 해설</li>
          <li>이름 한자별 뜻풀이와 발음·자원오행 분석</li>
          <li>고풍스러운 한문 서식의 PDF 열람 및 다운로드</li>
        </ul>
        {reportOrderId ? (
          <div className="space-y-2">
            <p className="font-medium text-primary">이미 구매한 리포트입니다.</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`/report/${reportOrderId}`}>리포트 보기</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/report/${reportOrderId}?download=1`}>PDF 다운로드</Link>
              </Button>
            </div>
          </div>
        ) : loggedIn ? (
          <Button onClick={() => setOpen(true)}>리포트 결제하기</Button>
        ) : (
          <Button asChild>
            <Link href={loginHref}>로그인하고 결제하기</Link>
          </Button>
        )}
      </CardContent>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          clearError();
        }}
        title="프리미엄 리포트 결제"
      >
        <dl className="space-y-1 rounded-md bg-secondary p-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">상품</dt>
            <dd>프리미엄 PDF 리포트</dd>
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
    </Card>
  );
}
