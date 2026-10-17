import Link from "next/link";

import { GoodsCard } from "@/components/goods-card";
import { ReportPurchase } from "@/components/report-purchase";
import { Button } from "@/components/ui/button";
import { PRODUCT_IDS, ELEMENT_LUCKY, lackingElement } from "@/lib/commerce/catalog";
import { isUuid } from "@/lib/commerce/payment-sync";
import { parseNamingParams } from "@/lib/naming/params";
import { analyzeChosen } from "@/lib/naming/service";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "리포트 · 맞춤 굿즈 | 이름핏" };
export const dynamic = "force-dynamic";

const ELEMENT_HANJA: Record<string, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };

function Problem({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-6 py-12">
      <p role="alert" className="text-destructive">
        {message}
      </p>
      <Button asChild>
        <Link href="/naming">작명으로 돌아가기</Link>
      </Button>
    </main>
  );
}

export default async function GoodsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const parsed = parseNamingParams(searchParams);
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const gh = first(searchParams.gh);
  const ge = first(searchParams.ge);
  // 마이페이지 저장 이름에서 온 경우: 주문에 저장 id 를 남긴다 (createOrder 가 소유·이름 일치를 확인)
  const hid = isUuid(first(searchParams.hid)) ? first(searchParams.hid) : undefined;
  if (!parsed.ok) return <Problem message={parsed.error} />;
  if (!gh || !ge) return <Problem message="이름 정보가 올바르지 않습니다." />;

  const supabase = createClient();
  const chosen = await analyzeChosen(supabase, parsed.value, gh, ge);
  if (!chosen) return <Problem message="이름 정보를 확인할 수 없습니다." />;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const p = parsed.value;
  const { yongsin } = chosen.saju;
  const lacking = lackingElement(yongsin.scores, yongsin.yongsin);
  const lucky = ELEMENT_LUCKY[lacking];
  const total = Object.values(yongsin.scores).reduce((a, b) => a + b, 0);
  const pct = total > 0 ? Math.round((yongsin.scores[lacking] / total) * 100) : 0;

  // 주문 생성 시 서버가 같은 값으로 사주를 다시 계산한다 (클라이언트 값은 신뢰하지 않음)
  const qs = new URLSearchParams(
    Object.entries(searchParams).flatMap(([k, v]) =>
      typeof v === "string" && k !== "gh" && k !== "ge" && k !== "hid" && k !== "saveError"
        ? [[k, v] as [string, string]]
        : []
    )
  ).toString();
  const here =
    `/goods?${qs}&gh=${encodeURIComponent(gh)}&ge=${encodeURIComponent(ge)}` + (hid ? `&hid=${hid}` : "");
  const loginHref = `/login?next=${encodeURIComponent(here)}`;
  const fullName = `${p.surname}${ge}`;

  return (
    <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-3xl space-y-8 px-6 py-12">
      <header className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          {hid ? (
            <Link href={`/mypage/names/${hid}`}>← 저장한 이름</Link>
          ) : (
            <Link href={`/naming/result?${qs}`}>← 추천 결과</Link>
          )}
        </Button>
        <h1 className="font-serif text-3xl font-bold">
          {fullName}
          <span className="ml-2 text-xl text-muted-foreground">
            {p.surnameHanja}
            {gh}
          </span>
        </h1>
        <p className="text-sm text-muted-foreground">
          사주에서 가장 부족한 기운은{" "}
          <b className="text-foreground">
            {ELEMENT_HANJA[lacking]}
            {lacking}
          </b>
          ({pct}%)입니다. 행운 동물 <b className="text-foreground">{lucky.animal}</b>, 행운 색상{" "}
          <b className="text-foreground">{lucky.color}</b>으로 기운을 채워 보세요.
        </p>
      </header>

      <ReportPurchase
        qs={qs}
        gh={gh}
        ge={ge}
        hid={hid}
        fullName={fullName}
        loggedIn={!!user}
        loginHref={loginHref}
      />

      <section className="space-y-4">
        <h2 className="font-serif text-2xl font-bold">사주 맞춤 자수 굿즈</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {PRODUCT_IDS.map((id) => (
            <GoodsCard
              key={id}
              product={id}
              lacking={lacking}
              defaultText={fullName}
              qs={qs}
              gh={gh}
              ge={ge}
              hid={hid}
              loggedIn={!!user}
              loginHref={loginHref}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
