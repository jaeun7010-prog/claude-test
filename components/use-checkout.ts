"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createOrder } from "@/app/orders/actions";
import type { CheckoutInput } from "@/lib/commerce/catalog";
import { requestPayment } from "@/lib/portone";

/**
 * 주문 생성(서버) → 포트원 결제창 → 결제 확인 페이지 이동.
 * 결제 검증과 orders 갱신은 /orders/complete 에서 서버 액션(confirmPayment)이 수행한다.
 *
 * 우리 결제 모달은 <dialog>.showModal() 이라 최상위 층에 그려져 포트원 결제창을 가린다.
 * 그래서 결제창을 띄우기 직전에 `onPaymentWindow`로 모달을 닫고, 취소·실패하면 `onPaymentFailed`로
 * 다시 열어 오류 문구와 결제 버튼을 보여 준다.
 */
export function useCheckout({
  onPaymentWindow,
  onPaymentFailed,
}: { onPaymentWindow?: () => void; onPaymentFailed?: () => void } = {}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay(input: CheckoutInput) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const order = await createOrder(input);
      if (!order.ok) {
        setError(order.error);
        return;
      }
      const completeUrl = `/orders/complete?orderId=${order.orderId}`;
      onPaymentWindow?.();
      const res = await requestPayment({
        orderName: order.orderName,
        totalAmount: order.amount,
        paymentId: order.paymentId,
        redirectUrl: `${window.location.origin}${completeUrl}`,
        customer: order.customer,
      });
      // 리다이렉트 방식(모바일)이면 이 지점에 오지 않는다
      if (res?.code !== undefined) {
        setError(res.message ?? "결제가 취소되었거나 실패했습니다.");
        onPaymentFailed?.();
        return;
      }
      router.push(completeUrl);
    } catch (e) {
      console.error("[checkout] 결제 요청 실패", e);
      setError("결제창을 여는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      onPaymentFailed?.();
    } finally {
      setBusy(false);
    }
  }

  return { pay, busy, error, clearError: () => setError(null) };
}
