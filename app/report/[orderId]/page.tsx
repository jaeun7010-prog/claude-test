import Link from "next/link";
import { redirect } from "next/navigation";

import { ReportDocument, type ReportData } from "@/components/report/report-document";
import { ReportDownloadButton } from "@/components/report/download-button";
import { Button } from "@/components/ui/button";
import { isUuid } from "@/lib/commerce/payment-sync";
import { buildReportSnapshot, isReportSnapshot, type ReportSnapshot } from "@/lib/commerce/report-snapshot";
import { parseNamingParams } from "@/lib/naming/params";
import { analyzeChosen } from "@/lib/naming/service";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "프리미엄 리포트 | 이름핏" };
export const dynamic = "force-dynamic";

const READABLE = ["paid", "preparing", "shipped", "delivered"];

function Notice({ message, href = "/mypage", label = "마이페이지로" }: { message: string; href?: string; label?: string }) {
  return (
    <main className="mx-auto max-w-xl space-y-4 px-6 py-12">
      <p role="alert" className="text-sm">
        {message}
      </p>
      <Button asChild>
        <Link href={href}>{label}</Link>
      </Button>
    </main>
  );
}

export default async function ReportPage({ params }: { params: { orderId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/report/${params.orderId}`)}`);

  if (!isUuid(params.orderId)) return <Notice message="올바르지 않은 주소입니다." />;

  // RLS 로 본인 주문만 조회된다
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_type, status, item_options, report_snapshot, paid_at, created_at")
    .eq("id", params.orderId)
    .maybeSingle();

  if (!order || order.order_type !== "premium_report")
    return <Notice message="리포트 주문을 찾을 수 없습니다." />;
  if (order.status === "pending")
    return (
      <Notice
        message="결제가 아직 확인되지 않았습니다. 결제를 마치셨다면 잠시 후 다시 확인해 주세요."
        href={`/orders/complete?orderId=${order.id}`}
        label="결제 상태 확인"
      />
    );
  if (!READABLE.includes(order.status))
    return <Notice message="취소 또는 환불된 주문이라 리포트를 열람할 수 없습니다." />;

  const opts = order.item_options as {
    qs?: string;
    name?: { given?: string; givenHanja?: string };
  };
  const issued = new Date(order.paid_at ?? order.created_at);
  const issuedAt = `${issued.getFullYear()}년 ${issued.getMonth() + 1}월 ${issued.getDate()}일`;

  let snapshot: ReportSnapshot;
  if (isReportSnapshot(order.report_snapshot)) {
    // 주문 시점에 고정한 내용만 보여 준다
    snapshot = order.report_snapshot;
  } else {
    // report_snapshot 도입(2026-10-18) 전 주문: 고정 내용이 없어 지금 엔진으로 다시 계산한다
    const parsed = parseNamingParams(Object.fromEntries(new URLSearchParams(opts.qs ?? "")));
    if (!parsed.ok || !opts.name?.given || !opts.name.givenHanja)
      return <Notice message="주문에 저장된 작명 정보를 읽을 수 없습니다. 고객센터로 문의해 주세요." />;
    const chosen = await analyzeChosen(supabase, parsed.value, opts.name.givenHanja, opts.name.given);
    if (!chosen) return <Notice message="이름 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." />;
    snapshot = buildReportSnapshot(parsed.value, chosen);
  }
  const data: ReportData = { ...snapshot, issuedAt };
  const fullName = `${data.surname}${data.given.map((c) => c.eum).join("")}`;

  return (
    <main className="mx-auto min-h-screen max-w-4xl space-y-6 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold">{fullName} 프리미엄 리포트</h1>
          <p className="text-sm text-muted-foreground">
            양가 어르신께 드리는 한문 작명 리포트 (A4 {data.legalAnalysis ? 4 : 3}쪽)
          </p>
        </div>
        <div className="flex items-start gap-2">
          <Button asChild variant="outline">
            <Link href="/mypage">마이페이지</Link>
          </Button>
          <ReportDownloadButton filename={`이름핏_리포트_${fullName}.pdf`} />
        </div>
      </header>
      {/* 리포트는 A4 고정 폭(794px)이라 좁은 화면에서는 가로로 스크롤한다 */}
      <div className="overflow-x-auto rounded-md border bg-secondary p-2">
        <ReportDocument data={data} />
      </div>
    </main>
  );
}
