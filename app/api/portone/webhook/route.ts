import { Webhook } from "@portone/server-sdk";

import { orderIdOf, syncOrderPayment } from "@/lib/commerce/payment-sync";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * 포트원 V2 웹훅 수신. 콘솔 > 결제연동 > 웹훅 관리에 `https://<도메인>/api/portone/webhook` 을 등록하고
 * 발급된 시크릿을 PORTONE_WEBHOOK_SECRET 에 넣는다.
 *
 * - 서명(Standard Webhooks)을 검증하지 못하면 400
 * - 본문의 값은 신뢰하지 않고, paymentId 로 포트원 API 를 다시 조회해 상태를 맞춘다
 * - 일시적 오류는 500 을 돌려 포트원이 재전송하게 하고, 처리할 필요 없는 이벤트는 200
 */
export async function POST(request: Request) {
  const secret = process.env.PORTONE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] PORTONE_WEBHOOK_SECRET 이 설정되지 않았습니다.");
    return new Response("webhook secret not configured", { status: 500 });
  }

  // 서명 검증에는 가공되지 않은 원문이 필요하다
  const body = await request.text();
  let hook: Webhook.Webhook;
  try {
    hook = await Webhook.verify(secret, body, Object.fromEntries(request.headers));
  } catch (e) {
    if (e instanceof Webhook.WebhookVerificationError) {
      return new Response("invalid signature", { status: 400 });
    }
    console.error("[webhook] 검증 중 오류", e);
    return new Response("verification error", { status: 400 });
  }

  // 결제 상태 변화 이벤트만 처리 (Transaction.Paid / Cancelled / Failed ...)
  if (!String(hook.type).startsWith("Transaction.")) return new Response("ignored", { status: 200 });

  const paymentId = (hook as { data?: { paymentId?: string } }).data?.paymentId;
  const orderId = paymentId ? orderIdOf(paymentId) : null;
  // 다른 서비스/테스트 결제는 우리 주문이 아니므로 재전송이 필요 없다
  if (!orderId) return new Response("not our payment", { status: 200 });

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    console.error("[webhook] admin 클라이언트 생성 실패", e);
    return new Response("server not configured", { status: 500 });
  }

  const result = await syncOrderPayment(admin, orderId);
  if (result.ok) return new Response("ok", { status: 200 });
  console.error("[webhook] 동기화 실패", { orderId, ...result });
  return new Response(result.error, { status: result.retryable ? 500 : 200 });
}
