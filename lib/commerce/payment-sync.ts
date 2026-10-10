import type { SupabaseClient } from "@supabase/supabase-js";

/** 가맹점 paymentId ↔ 주문 id 규칙. 주문 1건당 하나이며 주문 id 에서 결정된다. */
export const PAYMENT_ID_PREFIX = "namefit-";
export const paymentIdOf = (orderId: string) => `${PAYMENT_ID_PREFIX}${orderId}`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID.test(v);

/** paymentId 에서 주문 id 를 복원. 우리 규칙이 아니면 null */
export function orderIdOf(paymentId: string): string | null {
  if (!paymentId.startsWith(PAYMENT_ID_PREFIX)) return null;
  const id = paymentId.slice(PAYMENT_ID_PREFIX.length);
  return isUuid(id) ? id : null;
}

interface PortOnePayment {
  status?: string;
  transactionId?: string;
  paidAt?: string;
  currency?: string;
  amount?: { total?: number };
}

export type SyncResult =
  /** 주문의 최종 상태. 변화 없음(결제 미완료 등)이면 changed=false */
  | { ok: true; status: string; changed: boolean }
  /** retryable: 일시적 오류라 웹훅을 다시 보내게 해야 하는 경우 */
  | { ok: false; error: string; retryable: boolean };

const PAID_LIKE = ["paid", "preparing", "shipped", "delivered"];

/**
 * 포트원 서버의 결제 건을 직접 조회해 orders 를 맞춘다. 웹훅 본문이나 클라이언트 값은 신뢰하지 않는다.
 * - PAID: 금액/통화 검증 후 pending → paid
 * - CANCELLED: 결제 전이면 cancelled, 결제 후면 refunded
 * 같은 호출을 여러 번 해도 결과가 같다(멱등).
 * `admin` 은 service_role 클라이언트여야 한다.
 */
export async function syncOrderPayment(admin: SupabaseClient, orderId: string): Promise<SyncResult> {
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("id, status, amount")
    .eq("id", orderId)
    .maybeSingle();
  if (orderErr) {
    console.error("[payment-sync] 주문 조회 실패", orderErr);
    return { ok: false, error: "주문을 조회하지 못했습니다.", retryable: true };
  }
  if (!order) return { ok: false, error: "주문을 찾을 수 없습니다.", retryable: false };

  const secret = process.env.PORTONE_API_SECRET;
  if (!secret) return { ok: false, error: "결제 검증 설정(PORTONE_API_SECRET)이 누락되었습니다.", retryable: true };

  const paymentId = paymentIdOf(order.id);
  let payment: PortOnePayment;
  try {
    const res = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `PortOne ${secret}` },
      cache: "no-store",
    });
    if (res.status === 404) {
      return { ok: true, status: order.status, changed: false };
    }
    if (!res.ok) {
      console.error("[payment-sync] 포트원 조회 실패", res.status, await res.text());
      return { ok: false, error: "결제 내역을 확인하지 못했습니다.", retryable: true };
    }
    payment = await res.json();
  } catch (e) {
    console.error("[payment-sync] 포트원 조회 오류", e);
    return { ok: false, error: "결제 내역을 확인하지 못했습니다.", retryable: true };
  }

  const update = async (patch: Record<string, unknown>, fromStatuses: string[]) => {
    const { data, error } = await admin
      .from("orders")
      .update(patch)
      .eq("id", order.id)
      .in("status", fromStatuses)
      .select("status");
    if (error) {
      console.error("[payment-sync] 주문 갱신 실패", error);
      return { ok: false as const, error: "주문 반영에 실패했습니다.", retryable: true };
    }
    const changed = (data?.length ?? 0) > 0;
    return { ok: true as const, status: changed ? String(patch.status) : order.status, changed };
  };

  switch (payment.status) {
    case "PAID": {
      if (order.status !== "pending") return { ok: true, status: order.status, changed: false };
      if (payment.amount?.total !== order.amount || payment.currency !== "KRW") {
        // 재시도해도 같은 결과이므로 retryable=false. 운영자가 확인해야 한다.
        console.error("[payment-sync] 결제 금액 불일치", { orderId, expected: order.amount, payment });
        return {
          ok: false,
          error: "결제 금액이 주문 금액과 일치하지 않아 처리할 수 없습니다. 고객센터로 문의해 주세요.",
          retryable: false,
        };
      }
      return update(
        {
          status: "paid",
          payment_id: paymentId,
          portone_tx_id: payment.transactionId ?? null,
          paid_at: payment.paidAt ?? new Date().toISOString(),
        },
        ["pending"]
      );
    }
    case "CANCELLED": {
      if (order.status === "pending") return update({ status: "cancelled" }, ["pending"]);
      if (PAID_LIKE.includes(order.status)) return update({ status: "refunded" }, PAID_LIKE);
      return { ok: true, status: order.status, changed: false };
    }
    default:
      // READY / PENDING / FAILED / PARTIAL_CANCELLED 등: 상태를 바꾸지 않는다
      return { ok: true, status: order.status, changed: false };
  }
}
