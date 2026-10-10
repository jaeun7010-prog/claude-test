import Link from "next/link";
import { redirect } from "next/navigation";

import { PaymentConfirm } from "@/components/payment-confirm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { won } from "@/lib/commerce/catalog";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "결제 결과 | 이름핏" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OrderCompletePage({
  searchParams,
}: {
  searchParams: { orderId?: string; code?: string; message?: string };
}) {
  const orderId = searchParams.orderId ?? "";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mypage");

  const { data: order } = UUID.test(orderId)
    ? await supabase
        .from("orders")
        .select("id, status, item_name, amount, order_type, paid_at")
        .eq("id", orderId)
        .maybeSingle()
    : { data: null };

  // 리다이렉트 결제(모바일)에서 포트원이 붙여 주는 실패 정보
  const failed = !!searchParams.code;

  return (
    <main className="mx-auto min-h-screen max-w-xl space-y-6 px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle>
            {!order
              ? "주문을 찾을 수 없습니다"
              : order.status === "pending"
                ? failed
                  ? "결제에 실패했습니다"
                  : "결제 확인 중"
                : "결제가 완료되었습니다"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {order ? (
            <>
              <dl className="space-y-1">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">주문</dt>
                  <dd className="text-right">{order.item_name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">금액</dt>
                  <dd>{won(order.amount)}</dd>
                </div>
              </dl>
              {order.status === "pending" &&
                (failed ? (
                  <p role="alert" className="text-destructive">
                    {searchParams.message ?? "결제가 취소되었거나 실패했습니다."}
                  </p>
                ) : (
                  <PaymentConfirm orderId={order.id} />
                ))}
              {order.status !== "pending" && (
                <p className="text-muted-foreground">
                  {order.order_type === "goods"
                    ? "주문 제작 후 입력하신 주소로 배송해 드립니다. 진행 상황은 마이페이지에서 확인할 수 있어요."
                    : "구매 내역은 마이페이지에서 확인할 수 있어요."}
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">올바르지 않은 주문입니다.</p>
          )}
          <div className="flex gap-2">
            {order?.order_type === "premium_report" && order.status !== "pending" && (
              <Button asChild>
                <Link href={`/report/${order.id}`}>리포트 보기</Link>
              </Button>
            )}
            <Button asChild variant={order?.order_type === "premium_report" && order.status !== "pending" ? "outline" : "default"}>
              <Link href="/mypage">마이페이지로</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
