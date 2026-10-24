import Link from "next/link";

import { Button } from "@/components/ui/button";
import { NamingForm } from "@/components/naming-form";
import { NamingModeTabs } from "@/components/naming/naming-mode-tabs";
import { SajuCard } from "@/components/naming/saju-card";
import { SurnameDefaultNote } from "@/components/naming/surname-default-note";
import { SelfPicker } from "@/components/naming/self-picker";
import { loadEntitlement } from "@/lib/commerce/entitlement";
import { parseNamingParams, toNamingQuery } from "@/lib/naming/params";
import { REGISTRATION_CAVEAT } from "@/lib/naming/registration";
import { GRADE_MIN, SCORE_WEIGHTS } from "@/lib/naming/score";
import { runSelfNaming } from "@/lib/naming/self";
import { packSelfTable } from "@/lib/naming/self-pack";
import type { SelfPicks, SelfTable } from "@/lib/naming/self-rank";
import { suriWebName } from "@/lib/naming/suri81";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "직접 짓기 | 이름핏" };
export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** 직접 짓기 입력 화면 (주소에 조건이 없을 때) */
function SelfInput() {
  return (
    <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-serif text-3xl font-bold">사주 맞춤 작명</h1>
      <p className="mb-6 mt-2 text-sm text-muted-foreground break-keep">
        이름 소리를 이미 정하셨다면, 그 소리에 쓸 수 있는 한자와 아이 사주에 맞는 조합을 점수로 보여 드립니다.
      </p>
      <div className="mb-8">
        <NamingModeTabs active="self" />
      </div>
      <NamingForm mode="self" />
    </main>
  );
}

function SelfError({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-12 sm:px-6">
      <p role="alert" className="text-destructive">
        {message}
      </p>
      <Button asChild>
        <Link href="/naming/self">입력으로 돌아가기</Link>
      </Button>
    </main>
  );
}

/** 주소의 hj(자리마다 한자, 안 고른 자리는 _)를 자리별 번호로. 후보에 없는 한자는 안 고른 것으로 본다 */
function picksOf(t: SelfTable, hj: string): SelfPicks {
  const h = [...hj];
  return t.slots.map((s, i) => {
    const idx = s.chars.findIndex((c) => c.hanja === h[i]);
    return idx >= 0 ? idx : null;
  });
}

/** 점수표에 나오는 길한 수의 격 이름 (풀이 문장은 유료라 이름만 브라우저로 보낸다) */
function suriNamesOf(t: SelfTable): Record<number, string> {
  const names: Record<number, string> = {};
  for (const s of t.scores)
    for (const g of s?.gyeok ?? []) {
      if (!g.lucky || g.suri in names) continue;
      const name = suriWebName(g.suri);
      if (name) names[g.suri] = name;
    }
  return names;
}

export default async function SelfNamingPage({ searchParams }: { searchParams: Search }) {
  if (!one(searchParams.surname)) return <SelfInput />;

  const parsed = parseNamingParams(searchParams);
  if (!parsed.ok) return <SelfError message={parsed.error} />;
  const p = parsed.value;
  const given = one(searchParams.given).trim();

  const supabase = createClient();
  const result = await runSelfNaming(supabase, p, given);
  if (!result.ok) return <SelfError message={result.error} />;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  // 사주 상세(유료)는 같은 조건으로 결제한 리포트가 있을 때만 (추천받기 결과 화면과 같은 기준)
  const ent = await loadEntitlement(supabase, !!user, toNamingQuery(p, false));

  const t = result.table;
  // 추천받기로 옮겨 갈 때: 같은 사주·성, 정한 이름과 같은 글자 수
  const base = new URLSearchParams(toNamingQuery({ ...p, dolrimja: null, length: given.length === 1 ? "1" : "2" }));
  const recommendHref = `/naming/result?${base}`;
  const dolrimjaHref =
    given.length === 2
      ? `/naming/result?${(() => {
          const q = new URLSearchParams(base);
          q.set("dol", given[0]);
          q.set("dolpos", "1");
          return q;
        })()}`
      : null;

  return (
    <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">직접 짓기</p>
          <h1 className="font-serif text-2xl font-bold break-keep sm:text-3xl">
            {p.surname}
            {p.parentSurname?.hangul}
            {given} 한자 고르기
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {p.birth.year}.{p.birth.month}.{p.birth.day}
            {p.hasTime
              ? ` ${String(p.birth.hour).padStart(2, "0")}:${String(p.birth.minute).padStart(2, "0")}`
              : " (시각 미상)"}{" "}
            · {p.birthplace.label} 출생 · 월주 기준 절기 {result.saju.pillars.meta.monthTerm.ko}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/naming/self">다시 입력</Link>
        </Button>
      </header>

      <SurnameDefaultNote p={p} />

      {p.parentSurname && (
        <div role="note" className="space-y-1 rounded-md border p-4 text-sm">
          <p className="font-medium">출생신고 시에는 이렇게 등록됩니다</p>
          <p className="break-keep">
            부를 때는 &lsquo;{p.surname}
            {p.parentSurname.hangul}
            {given}&rsquo;이지만, 성은 <b>{p.surname}({p.surnameHanja})</b> 하나로 등록하고{" "}
            <b>
              {p.parentSurname.hangul}
              {given}({p.parentSurname.hanja}
              {"○".repeat(given.length)})
            </b>
            을 이름으로 등록합니다.
          </p>
          <p className="text-xs text-muted-foreground">
            {REGISTRATION_CAVEAT.replace(
              "법적 이름 전체 기준 점수는 각 이름의 자세히 보기에 있습니다.",
              "법적 이름 전체 기준 등급·점수는 고른 조합 아래에 참고로 보여 드립니다."
            )}
          </p>
        </div>
      )}

      <SajuCard saju={result.saju} p={p} detailed={ent.saju} />

      <section id="names" className="scroll-mt-16 space-y-4">
        <div className="space-y-1">
          <h2 className="font-serif text-2xl font-bold">한자 고르기</h2>
          <p className="text-xs text-muted-foreground break-keep">
            등급은 추천받기와 같은 성명학 점수예요. 사주 보완 {SCORE_WEIGHTS.saju} · 수리 {SCORE_WEIGHTS.suri} ·
            발음오행 {SCORE_WEIGHTS.pronunciation} · 자원오행 {SCORE_WEIGHTS.resource}점 배점의 100점 만점이고, S{" "}
            {GRADE_MIN.S}점 이상 · A {GRADE_MIN.A}점 이상 · B {GRADE_MIN.B}점 이상 · 그 밖은 C입니다. 정하신 소리를
            그대로 두고 모든 한자 조합을 계산했어요.
          </p>
        </div>
        <SelfPicker
          packed={packSelfTable(t)}
          initialPicks={picksOf(t, one(searchParams.hj))}
          surnameHangul={p.surname}
          surnameHanja={p.surnameHanja}
          prefix={p.parentSurname}
          suriNames={suriNamesOf(t)}
          recommendHref={recommendHref}
          dolrimjaHref={dolrimjaHref}
        />
      </section>
    </main>
  );
}
