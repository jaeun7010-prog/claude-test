"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export interface OrderListItem {
  id: string;
  kind: "report" | "goods";
  /** 아이 이름 (성 + 이름). 주문에 이름 정보가 없으면 주문명 */
  name: string;
  hanja: string;
  /** 예: 프리미엄 리포트, 자수 턱받이 × 2 */
  product: string;
  amount: number;
  status: string;
  createdAt: string;
  trackingNumber: string | null;
  /** 같은 이름으로 다시 주문하는 화면 (/goods). 입력 조건이 없으면 null */
  reorderHref: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  paid: "결제 완료",
  preparing: "배송 준비",
  shipped: "배송 중",
  delivered: "배송 완료",
  cancelled: "취소",
  refunded: "환불",
};

const READABLE = ["paid", "preparing", "shipped", "delivered"];

const dateText = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

function StatusBadge({ status }: { status: string }) {
  const active = READABLE.includes(status);
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
      }`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function CopyTracking({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // 복사가 막힌 브라우저: 송장 번호는 둘째 줄에 보이므로 그대로 둔다
        }
      }}
    >
      {copied ? "복사했어요" : "송장 번호 복사"}
    </Button>
  );
}

/** 할 수 있는 일: 리포트는 보기·PDF, 굿즈는 상태에 따라 송장 복사·다시 주문 */
function Actions({ o }: { o: OrderListItem }) {
  const buttons: React.ReactNode[] = [];
  if (o.kind === "report" && READABLE.includes(o.status)) {
    buttons.push(
      <Button key="view" asChild size="sm">
        <Link href={`/report/${o.id}`}>리포트 보기</Link>
      </Button>,
      <Button key="pdf" asChild size="sm" variant="outline">
        <Link href={`/report/${o.id}?download=1`}>PDF 다운로드</Link>
      </Button>
    );
  }
  if (o.kind === "goods") {
    if ((o.status === "shipped" || o.status === "delivered") && o.trackingNumber)
      buttons.push(<CopyTracking key="track" value={o.trackingNumber} />);
    if (READABLE.includes(o.status) && o.reorderHref)
      buttons.push(
        <Button key="again" asChild size="sm" variant="outline">
          <Link href={o.reorderHref}>같은 이름으로 다시 주문</Link>
        </Button>
      );
  }
  if (buttons.length === 0) return null;
  return <div className="flex flex-wrap gap-2 pt-1">{buttons}</div>;
}

/** 마이페이지 주문 내역: 한 주문 = 한 칸 (이름·상태 / 상품·금액·날짜 / 버튼) */
export function OrderList({ items }: { items: OrderListItem[] }) {
  return (
    <ul className="divide-y">
      {items.map((o) => (
        <li key={o.id} className="space-y-1 py-3">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 font-serif text-lg font-bold break-keep">
              {o.name}
              {o.hanja && <span className="ml-2 text-sm font-normal text-muted-foreground">{o.hanja}</span>}
            </p>
            <StatusBadge status={o.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {o.product} · {o.amount.toLocaleString("ko-KR")}원 · {dateText(o.createdAt)}
            {o.trackingNumber && ` · 송장 ${o.trackingNumber}`}
          </p>
          <Actions o={o} />
        </li>
      ))}
    </ul>
  );
}
