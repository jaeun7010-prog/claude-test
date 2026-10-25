import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataSourceNote } from "@/components/data-source-note";
import { CombinationNote } from "@/components/naming/combination-note";
import { NameCardBody } from "@/components/naming/hanja-name-card";
import { SajuCard } from "@/components/naming/saju-card";
import { SurnameDefaultNote } from "@/components/naming/surname-default-note";
import { loadEntitlement } from "@/lib/commerce/entitlement";
import { isUuid } from "@/lib/commerce/payment-sync";
import { getLatestSnapshot } from "@/lib/name-stats/snapshot";
import { parseNamingParams, toNamingQuery } from "@/lib/naming/params";
import { registrationCaveat } from "@/lib/naming/registration";
import { GRADE_MIN, SCORE_WEIGHTS } from "@/lib/naming/score";
import { loadSelfChoice, selfQueryOf } from "@/lib/naming/self";
import { selfPickHref, selfResultHref, SELF_SOURCE_PARAM, SELF_SOURCE_VALUE } from "@/lib/naming/self-href";
import { loadNameSummaries } from "@/lib/stats/name-stats";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "직접 지은 이름 | 이름핏" };
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
  const parsed = parseNamingParams(searchParams);
  if (!parsed.ok) return <Problem message={parsed.error} href="/naming/self" />;
  const p = parsed.value;
  const given = one(searchParams.given).trim();
  const hj = one(searchParams.hj).trim();
  const selfQ = selfQueryOf(p);
  const pickHref = selfPickHref(selfQ, given, hj);

  const supabase = createClient();
  const choice = await loadSelfChoice(supabase, p, given, hj);
  if (!choice.ok) return <Problem message={choice.error} href={pickHref} />;
  const { chosen, recommendation: r } = choice;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [ent, stats] = await Promise.all([
    loadEntitlement(supabase, !!user, toNamingQuery(p, false)),
    loadNameSummaries(supabase, [r.hangul]).catch((e) => {
      console.error("[naming] 통계 조회 실패", e);
      return null;
    }),
  ]);
  const snapshot = stats ? await getLatestSnapshot() : null;

  const savedId = one(searchParams.saved);
  const saved = isUuid(savedId) ? { id: savedId, already: one(searchParams.already) === "1" } : null;
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
        <h1 className="font-serif text-2xl font-bold break-keep sm:text-3xl">
          {p.surname}
          {r.hangul}
          <span className="ml-2 text-xl text-muted-foreground">
            {p.surnameHanja}
            {fullHanja}
          </span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {p.birth.year}.{p.birth.month}.{p.birth.day}
          {p.hasTime
            ? ` ${String(p.birth.hour).padStart(2, "0")}:${String(p.birth.minute).padStart(2, "0")}`
            : " (시각 미상)"}{" "}
          · {p.birthplace.label} 출생 · 월주 기준 절기 {chosen.saju.pillars.meta.monthTerm.ko}
        </p>
      </header>

      {saved && (
        <p role="status" className="rounded-md bg-secondary p-3 text-sm">
          {saved.already ? "이미 마이페이지에 저장한 이름이에요. " : "마이페이지에 저장했어요. "}
          <Link href={`/mypage/names/${saved.id}`} className="text-primary underline underline-offset-2">
            저장한 이름 보기
          </Link>
        </p>
      )}
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
