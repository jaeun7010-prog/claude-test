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
import { registrationText } from "@/lib/naming/registration";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "마이페이지 | 이름핏" };

const ORDER_STATUS: Record<string, string> = {
  paid: "결제 완료",
  preparing: "제작 중",
  shipped: "배송 중",
  delivered: "배송 완료",
  cancelled: "취소",
  refunded: "환불",
};

export default async function MyPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mypage");

  const [{ data: profile }, { data: history }, { data: orders }] = await Promise.all([
    supabase
      .from("profiles")
      .select("name, email")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_naming_history")
      .select(
        "id, surname, surname_hanja, given_name, given_name_hanja, total_score, is_favorite, created_at, filters"
      )
      .order("created_at", { ascending: false }),
    // 결제 대기(미결제) 주문은 목록에서 제외
    supabase
      .from("orders")
      .select("id, item_name, order_type, status, amount, quantity, created_at, tracking_number")
      .neq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  const displayName = profile?.name || user.email;

  return (
    <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-3xl space-y-8 px-6 py-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">마이페이지</h1>
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
            {history?.length ?? 0}건이 저장되어 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history && history.length > 0 ? (
            <ul className="divide-y">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="font-serif text-lg font-bold">
                      {h.surname}
                      {h.given_name}
                      {h.is_favorite && " ★"}
                    </p>
                    {(h.surname_hanja || h.given_name_hanja) && (
                      <p className="font-serif text-sm text-muted-foreground">
                        {h.surname_hanja}
                        {h.given_name_hanja}
                      </p>
                    )}
                    {(h.filters as { parentSurname?: unknown } | null)?.parentSurname ? (
                      <p className="text-xs text-muted-foreground">
                        {registrationText({
                          surname: h.surname,
                          surnameHanja: h.surname_hanja ?? "",
                          given: h.given_name,
                          givenHanja: h.given_name_hanja ?? "",
                        })}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {h.total_score != null && (
                      <p className="font-medium text-foreground">
                        {Number(h.total_score)}점
                      </p>
                    )}
                    <p>{new Date(h.created_at).toLocaleDateString("ko-KR")}</p>
                  </div>
                </li>
              ))}
            </ul>
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
            <ul className="divide-y">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {o.item_name}
                      {o.quantity > 1 && ` × ${o.quantity}`}
                    </p>
                    <p className="text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("ko-KR")}
                      {o.tracking_number && ` · 송장 ${o.tracking_number}`}
                    </p>
                    {o.order_type === "premium_report" &&
                      ["paid", "preparing", "shipped", "delivered"].includes(o.status) && (
                        <Link
                          href={`/report/${o.id}`}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          리포트 보기 · PDF 다운로드
                        </Link>
                      )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{o.amount.toLocaleString("ko-KR")}원</p>
                    <p className="text-muted-foreground">{ORDER_STATUS[o.status] ?? o.status}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">주문 내역이 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
