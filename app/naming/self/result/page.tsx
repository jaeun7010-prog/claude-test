import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataSourceNote } from "@/components/data-source-note";
import { NameWithHanja } from "@/components/brand/NameWithHanja";
import { AddressNote } from "@/components/naming/address-note";
import { ElementNeed } from "@/components/naming/element-need";
import { CombinationNote } from "@/components/naming/combination-note";
import { NameCardBody } from "@/components/naming/hanja-name-card";
import { SajuCard } from "@/components/naming/saju-card";
import { SurnameDefaultNote } from "@/components/naming/surname-default-note";
import { ALREADY_PARAM, SAVED_PARAM } from "@/components/naming/saved-status";
import { loadEntitlement } from "@/lib/commerce/entitlement";
import { isUuid } from "@/lib/commerce/payment-sync";
import { getLatestSnapshot } from "@/lib/name-stats/snapshot";
import { namingChildQuery, parseNamingParams } from "@/lib/naming/params";
import { registrationCaveat } from "@/lib/naming/registration";
import { GRADE_MIN, SCORE_WEIGHTS } from "@/lib/naming/score";
import { loadSelfChoice, selfQueryOf } from "@/lib/naming/self";
import { selfPickHref, selfResultHref, SELF_SOURCE_PARAM, SELF_SOURCE_VALUE } from "@/lib/naming/self-href";
import { loadNameSummaries } from "@/lib/stats/name-stats";
import { loadSavedLookup, NO_SAVED } from "@/lib/naming/saved";
import { openSearch, redirectIfPlain, sealQuery } from "@/lib/naming/url-seal";
import { createClient } from "@/lib/supabase/server";

// 화면에 생년월일·시각·출생지가 보이므로 검색에 나오지 않게 한다
export const metadata = { title: "직접 지은 이름 | 이름핏", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function Problem({ message, href }: { message: string; href: string }) {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-12 sm:px-6">
      <p role="alert" className="text-destructive">
        {message}
      </p>
      <Button asChild>
        <Link href={href}>한자 고르기로 돌아가기</Link>
      </Button>
    </main>
  );
}

/**
 * 셀프 작명(직접 짓기)으로 고른 조합의 결과 화면: 추천받기와 같은 이름 카드(이름 뜻 한 줄·점수·4격·저장·리포트).
 * 주소의 조합은 셀프 작명 후보인지 서버에서 다시 확인한다 (loadSelfChoice → isSelfSelectable).
 */
export default async function SelfResultPage({ searchParams }: { searchParams: Search }) {
  redirectIfPlain("/naming/self/result", searchParams);
  const parsed = parseNamingParams(openSearch(searchParams));
  if (!parsed.ok) return <Problem message={parsed.error} href="/naming/self" />;
  const p = parsed.value;
  const given = one(searchParams.given).trim();
  const hj = one(searchParams.hj).trim();
  const selfQ = sealQuery(selfQueryOf(p));
  const pickHref = selfPickHref(selfQ, given, hj);

  const supabase = createClient();
  const choice = await loadSelfChoice(supabase, p, given, hj);
  if (!choice.ok) return <Problem message={choice.error} href={pickHref} />;
  const { chosen, recommendation: r } = choice;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [ent, savedLookup, stats] = await Promise.all([
    loadEntitlement(supabase, !!user, namingChildQuery(p)),
    user ? loadSavedLookup(supabase, p) : NO_SAVED,
    loadNameSummaries(supabase, [r.hangul]).catch((e) => {
      console.error("[naming] 통계 조회 실패", e);
      return null;
    }),
  ]);
  const snapshot = stats ? await getLatestSnapshot() : null;

  const savedId = one(searchParams[SAVED_PARAM]);
  const saved = isUuid(savedId) ? { id: savedId, already: one(searchParams[ALREADY_PARAM]) === "1" } : null;
  // 리포트·굿즈로 넘어갈 때 셀프 작명 조합이라는 표시 (주문할 때도 조합을 다시 확인한다)
  const qs = `${selfQ}&${SELF_SOURCE_PARAM}=${SELF_SOURCE_VALUE}`;
  const fullHanja = r.givenName.map((c) => c.hanja).join("");

  return (
    <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <Button asChild variant="outline" className="h-auto w-full justify-start whitespace-normal py-2.5 text-left sm:w-auto">
        <Link href={pickHref}>← 한자 고르기로 돌아가기</Link>
      </Button>

      <header className="min-w-0">
        <p className="text-sm text-muted-foreground">직접 짓기 · 고른 조합</p>
        <h1 className="mt-1">
          <NameWithHanja name={`${p.surname}${r.hangul}`} hanja={`${p.surnameHanja}${fullHanja}`} nameSize={32} hanjaSize={16} />
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {p.birth.year}.{p.birth.month}.{p.birth.day}
          {p.hasTime
            ? ` ${String(p.birth.hour).padStart(2, "0")}:${String(p.birth.minute).padStart(2, "0")}`
            : " (시각 미상)"}{" "}
          · {p.birthplace.label} 출생 · 월주 기준 절기 {chosen.saju.pillars.meta.monthTerm.ko}
        </p>
      </header>

      <ElementNeed yongsin={chosen.saju.yongsin} heading="h2" meta={`${p.surname}씨 아이의 사주`} />

      <AddressNote />

      {searchParams.saveError && (
        <p role="alert" className="text-sm text-destructive">
          저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      )}

      <SurnameDefaultNote p={p} />

      {p.parentSurname && (
        <p className="rounded-md border p-4 text-xs text-muted-foreground">{registrationCaveat(!ent.saju)}</p>
      )}
      {chosen.combination && p.parentSurname && (
        <CombinationNote
          items={chosen.combination}
          label={`${p.surname} + ${p.parentSurname.hangul}`}
          locked={!ent.saju}
        />
      )}

      <section id="names" className="scroll-mt-16 space-y-3">
        <Card>
          <CardContent className="space-y-3 p-4 sm:p-5">
            <NameCardBody
              group={{ hangul: r.hangul, options: [r] }}
              p={p}
              stat={stats?.summaries.get(r.hangul)}
              asOfDate={snapshot?.asOfDate ?? null}
              qs={qs}
              loggedIn={!!user}
              ent={ent}
              self={{ resultHref: selfResultHref(selfQ, given, hj), given, givenHanja: hj }}
              saved={saved ? { ...saved, givenHanja: fullHanja } : undefined}
              savedLookup={savedLookup}
            />
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground break-keep">
          등급은 추천받기와 같은 성명학 점수예요. 사주 보완 {SCORE_WEIGHTS.saju} · 수리 {SCORE_WEIGHTS.suri} · 발음오행{" "}
          {SCORE_WEIGHTS.pronunciation} · 자원오행 {SCORE_WEIGHTS.resource}점 배점의 100점 만점이고, S {GRADE_MIN.S}점
          이상 · A {GRADE_MIN.A}점 이상 · B {GRADE_MIN.B}점 이상 · 그 밖은 C입니다.
        </p>
        {stats && <DataSourceNote />}
      </section>

      <SajuCard saju={chosen.saju} p={p} detailed={ent.saju} />
    </main>
  );
}
