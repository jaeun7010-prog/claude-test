"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { confirmPayment } from "@/app/orders/actions";
import { Button } from "@/components/ui/button";

/** 결제 직후 서버에서 포트원 결제를 검증하고 orders 를 갱신한 뒤 페이지를 새로고침한다. */
export function PaymentConfirm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    confirmPayment(orderId).then((r) => {
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  }, [orderId, router, attempt]);

  if (error) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setError(null);
            started.current = false;
            setAttempt((n) => n + 1);
          }}
        >
          다시 확인
        </Button>
      </div>
    );
  }
  return (
    <p role="status" className="text-sm text-muted-foreground">
      결제 내역을 확인하고 있습니다…
    </p>
  );
}
