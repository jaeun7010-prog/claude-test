import Link from "next/link";

import { GoodsCard } from "@/components/goods-card";
import { ReportPurchase } from "@/components/report-purchase";
import { Button } from "@/components/ui/button";
import { PRODUCT_IDS, ELEMENT_LUCKY, lackingElement } from "@/lib/commerce/catalog";
import { loadEntitlement } from "@/lib/commerce/entitlement";
import { isUuid } from "@/lib/commerce/payment-sync";
import { namingChildKey, parseNamingParams } from "@/lib/naming/params";
import { analyzeChosen } from "@/lib/naming/service";
import { loadSelfChoice, selfQueryOf } from "@/lib/naming/self";
import { selfResultHref, SELF_SOURCE_PARAM, SELF_SOURCE_VALUE } from "@/lib/naming/self-href";
import { openQuery, openSearch, redirectIfPlain, sealQuery } from "@/lib/naming/url-seal";
import { createClient } from "@/lib/supabase/server";

// 사주를 보여 주는 화면이라 검색에 나오지 않게 한다
export const metadata = { title: "리포트 · 맞춤 굿즈 | 이름핏", robots: { index: false, follow: false } };
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
  redirectIfPlain("/goods", searchParams);
  const parsed = parseNamingParams(openSearch(searchParams));
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
  // 직접 짓기에서 온 조합: 셀프 작명 후보인지 확인하고, 돌아가기는 고른 조합 결과 화면으로.
  // gh·ge는 법적 이름이라 부모 성 함께 쓰기면 그 글자를 떼고 본다
  let selfBack: string | null = null;
  if (first(searchParams[SELF_SOURCE_PARAM]) === SELF_SOURCE_VALUE) {
    const n = [...(parsed.value.parentSurname?.hangul ?? "")].length;
    const selfGiven = [...ge].slice(n).join("");
    const selfHanja = [...gh].slice(n).join("");
    const self = await loadSelfChoice(supabase, parsed.value, selfGiven, selfHanja);
    if (!self.ok) return <Problem message={self.error} />;
    selfBack = selfResultHref(sealQuery(selfQueryOf(parsed.value)), selfGiven, selfHanja);
  }

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
  // 이 이름의 리포트를 이미 샀으면 결제 대신 리포트 보기 (같은 리포트를 두 번 사지 않게)
  const reportOrderId = user
    ? (await loadEntitlement(supabase, true, namingChildKey(openQuery(qs)), hid)).reportOrderId(gh, ge)
    : null;
  const fullName = `${p.surname}${ge}`;

  return (
    <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-3xl space-y-8 px-6 py-12">
      <header className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          {hid ? (
            <Link href={`/mypage/names/${hid}`}>← 저장한 이름</Link>
          ) : selfBack ? (
            <Link href={selfBack}>← 직접 지은 이름</Link>
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
        reportOrderId={reportOrderId}
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
