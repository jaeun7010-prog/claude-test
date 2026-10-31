import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OrderList, type OrderListItem } from "@/components/mypage/order-list";
import { SavedList } from "@/components/mypage/saved-list";
import { PRODUCTS } from "@/lib/commerce/catalog";
import { findReportOrder, loadPaidReports } from "@/lib/commerce/entitlement";
import { CATEGORY_LABEL } from "@/lib/naming/native/score";
import { nativeRegistrationText, registrationText } from "@/lib/naming/registration";
import { namingChildKey } from "@/lib/naming/params";
import { sealQuery } from "@/lib/naming/url-seal";
import { readSaved, SAVED_COLUMNS, type SavedRow } from "@/lib/naming/saved";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "마이페이지 | 이름핏" };

interface OrderRow {
  id: string;
  item_name: string;
  item_options: unknown;
  order_type: string;
  status: string;
  amount: number;
  quantity: number;
  created_at: string;
  paid_at: string | null;
  tracking_number: string | null;
  history_id: string | null;
}

/** 주문 한 건을 목록 한 칸으로. 이름·상품은 주문할 때 남긴 item_options 에서 읽는다 */
function orderItemOf(o: OrderRow): OrderListItem {
  const opt = (o.item_options ?? {}) as {
    qs?: unknown;
    product?: unknown;
    name?: { surname?: unknown; given?: unknown; surnameHanja?: unknown; givenHanja?: unknown };
  };
  const n = opt.name;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const name = n ? `${str(n.surname)}${str(n.given)}` : "";
  const kind = o.order_type === "premium_report" ? "report" : "goods";
  const productLabel =
    kind === "report"
      ? "프리미엄 리포트"
      : (PRODUCTS as Record<string, { label: string }>)[str(opt.product)]?.label ?? "맞춤 굿즈";
  const qs = str(opt.qs);
  return {
    id: o.id,
    kind,
    name: name || o.item_name,
    hanja: n ? `${str(n.surnameHanja)}${str(n.givenHanja)}` : "",
    product: o.quantity > 1 ? `${productLabel} × ${o.quantity}` : productLabel,
    amount: o.amount,
    status: o.status,
    createdAt: o.paid_at ?? o.created_at,
    trackingNumber: o.tracking_number,
    reorderHref:
      qs && n
        ? `/goods?${sealQuery(qs)}&gh=${encodeURIComponent(str(n.givenHanja))}&ge=${encodeURIComponent(str(n.given))}` +
          (o.history_id ? `&hid=${o.history_id}` : "")
        : null,
  };
}

export default async function MyPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mypage");

  const [{ data: profile }, { data: history }, { data: orders }, paidReports] = await Promise.all([
    supabase
      .from("profiles")
      .select("name, email")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_naming_history")
      .select(SAVED_COLUMNS)
      .order("created_at", { ascending: false }),
    // 결제 대기(미결제)와 결제 전에 취소된 주문(결제창에서 취소)은 목록에서 뺀다. 결제 후 취소·환불은 보여 준다
    supabase
      .from("orders")
      .select(
        "id, item_name, item_options, order_type, status, amount, quantity, created_at, paid_at, tracking_number, history_id"
      )
      .neq("status", "pending")
      .or("status.neq.cancelled,paid_at.not.is.null")
      .order("created_at", { ascending: false }),
    loadPaidReports(supabase),
  ]);

  const displayName = profile?.name || user.email;
  const saved = (history ?? []).map((h) => readSaved(h as SavedRow));

  return (
    <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">마이페이지</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {displayName}님, 환영합니다.
          </p>
        </div>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            로그아웃
          </Button>
        </form>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>내 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">이름</span>{" "}
            {profile?.name || "-"}
          </p>
          <p>
            <span className="text-muted-foreground">이메일</span>{" "}
            {profile?.email ?? user.email}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>저장된 작명 결과</CardTitle>
          <CardDescription>
            {saved.length}건이 저장되어 있습니다. 이름을 누르면 저장할 때의 분석을, 2~3개를 고르면 나란히 비교해 볼 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {saved.length > 0 ? (
            <SavedList
              items={saved.map((h) => ({
                id: h.id,
                name: `${h.surname}${h.given}`,
                hanja: `${h.surnameHanja}${h.givenHanja}`,
                grade: h.grade,
                score: h.totalScore,
                favorite: h.isFavorite,
                registration: !h.parentSurname
                  ? null
                  : h.kind === "native"
                  ? nativeRegistrationText({ surname: h.surname, surnameHanja: h.surnameHanja, given: h.given })
                  : registrationText({
                      surname: h.surname,
                      surnameHanja: h.surnameHanja,
                      given: h.given,
                      givenHanja: h.givenHanja,
                    }),
                native: h.native
                  ? {
                      score: h.native.score.total,
                      line: `${CATEGORY_LABEL[h.native.name.category]} · ${h.native.name.meaning}`,
                    }
                  : null,
                self: h.source === "self",
                createdAt: h.createdAt,
                // 저장 이름과 연결된 리포트이거나 같은 아이·같은 이름의 리포트를 결제했으면 (순우리말은 리포트 없음)
                reportPurchased:
                  h.kind === "hanja" &&
                  !!findReportOrder(paidReports, {
                    historyId: h.id,
                    childKey: h.qs ? namingChildKey(h.qs) : null,
                    givenHanja: h.givenHanja,
                    given: h.given,
                  }),
              }))}
            />
          ) : (
            <div className="space-y-3 py-6 text-center text-sm text-muted-foreground">
              <p>아직 저장된 작명 결과가 없습니다.</p>
              <Button asChild size="sm">
                <Link href="/">작명 시작하기</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>주문 내역</CardTitle>
          <CardDescription>리포트와 맞춤 굿즈 결제 내역입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {orders && orders.length > 0 ? (
            <OrderList items={(orders as OrderRow[]).map(orderItemOf)} />
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">주문 내역이 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
