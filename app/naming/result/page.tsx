import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DataSourceNote } from "@/components/data-source-note";
import type { ResultItem } from "@/components/naming/result-list";
import { NamingTabs } from "@/components/naming/naming-tabs";
import { NativeCardBody } from "@/components/naming/native-card";
import { NameCardBody } from "@/components/naming/hanja-name-card";
import { SajuCard } from "@/components/naming/saju-card";
import { SurnameDefaultNote } from "@/components/naming/surname-default-note";
import {
  ALREADY_PARAM,
  SAVE_RESULT_PARAMS,
  SAVED_HANJA_PARAM,
  SAVED_NATIVE_PARAM,
  SAVED_PARAM,
} from "@/components/naming/saved-status";
import { isUuid } from "@/lib/commerce/payment-sync";
import { CombinationNote } from "@/components/naming/combination-note";
import { loadEntitlement } from "@/lib/commerce/entitlement";
import { namingChildQuery, parseNamingParams } from "@/lib/naming/params";
import { firstSoundKey, parsePriorities, type Priorities } from "@/lib/naming/priorities";
import { NATIVE_SCORE_WEIGHTS } from "@/lib/naming/native/score";
import { NATIVE_DISPLAY_LIMIT, runNativeNaming } from "@/lib/naming/native/service";
import { registrationCaveat } from "@/lib/naming/registration";
import { checkSelfName, selfQueryOf } from "@/lib/naming/self";
import { cleanSelfHanja, FROM_SELF_GIVEN, FROM_SELF_HANJA, selfPickHref } from "@/lib/naming/self-href";
import { GRADE_MIN, SCORE_WEIGHTS } from "@/lib/naming/score";
import { DISPLAY_LIMIT, runNaming } from "@/lib/naming/service";
import { getLatestSnapshot } from "@/lib/name-stats/snapshot";
import { loadSavedLookup, NO_SAVED } from "@/lib/naming/saved";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "추천 결과 | 이름핏" };
export const dynamic = "force-dynamic";

export default async function ResultPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const parsed = parseNamingParams(searchParams);
  if (!parsed.ok) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 px-6 py-12">
        <p role="alert" className="text-destructive">
          {parsed.error}
        </p>
        <Button asChild>
          <Link href="/naming">입력으로 돌아가기</Link>
        </Button>
      </main>
    );
  }
  const p = parsed.value;

  const supabase = createClient();
  const result = await runNaming(supabase, p);
  if (!result.ok) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 px-6 py-12">
        <p role="alert" className="text-destructive">
          {result.error}
        </p>
        <Button asChild>
          <Link href="/naming">입력으로 돌아가기</Link>
        </Button>
      </main>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 순우리말 탭도 서버에서 함께 만든다 (사주는 한자 쪽 결과를 그대로 쓴다)
  const [native, ent, savedLookup] = await Promise.all([
    runNativeNaming(supabase, p, result.saju),
    // 유료 내용(사주 상세·이름 상세)은 결제한 리포트가 있을 때만 그린다 (lib/commerce/entitlement.ts)
    loadEntitlement(supabase, !!user, namingChildQuery(p)),
    // 이미 저장한 이름은 카드에 "✓ 저장한 이름" (같은 아이 + 같은 이름)
    user ? loadSavedLookup(supabase, p) : NO_SAVED,
  ]);
  const snapshot = result.stats || native.stats ? await getLatestSnapshot() : null;

  // 직접 짓기의 "이 사주에 맞는 다른 소리 보기"로 왔으면 입력한 이름·고른 한자 그대로 돌아가는 버튼
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const selfGiven = one(searchParams[FROM_SELF_GIVEN]).trim();
  const backToSelf =
    selfGiven && !checkSelfName(selfGiven, p.parentSurname?.hangul)
      ? {
          given: selfGiven,
          href: selfPickHref(
            selfQueryOf(p),
            selfGiven,
            cleanSelfHanja(one(searchParams[FROM_SELF_HANJA]), [...selfGiven].length)
          ),
        }
      : null;

  const qs = new URLSearchParams(
    Object.entries(searchParams).flatMap(([k, v]) =>
      typeof v === "string" && !SAVE_RESULT_PARAMS.includes(k) ? [[k, v] as [string, string]] : []
    )
  ).toString();

  // 저장하고 돌아왔으면 그 카드에 "마이페이지에 저장했어요" (app/naming/actions.ts)
  const savedId = one(searchParams[SAVED_PARAM]);
  const savedNotice = isUuid(savedId) ? { id: savedId, already: one(searchParams[ALREADY_PARAM]) === "1" } : null;
  const savedHanja = savedNotice ? one(searchParams[SAVED_HANJA_PARAM]) : "";
  const savedNative = savedNotice ? one(searchParams[SAVED_NATIVE_PARAM]) : "";

  // 로그인 사용자의 저장된 우선순위 (컬럼이 아직 없거나 값이 없으면 null)
  let saved: Priorities | null = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("naming_priorities").eq("id", user.id).maybeSingle();
    if (data?.naming_priorities) saved = parsePriorities(data.naming_priorities);
  }

  const items: ResultItem[] = result.groups.map((g) => {
    const best = g.options[0];
    const st = result.stats?.get(g.hangul);
    return {
      hangul: g.hangul,
      grade: best.analysis.grade,
      // 소리 자리 확인을 풀고 채운 이름은 어떤 정렬에서도 맨 뒤 (name-sounds.ts)
      demoted: g.soundFill,
      // 같은 첫소리는 상위에 FIRST_SOUND_MAX개까지 (부모 성 함께 쓰기는 새로 고르는 첫 글자 기준)
      firstSound: firstSoundKey([...g.hangul][p.parentSurname ? [...p.parentSurname.hangul].length : 0] ?? ""),
      metrics: {
        baseScore: best.baseScore,
        globalScore: best.globalScore,
        births: result.stats ? (st ? st.cumulative.male + st.cumulative.female : 0) : null,
        everListed: result.stats ? (st?.everListed ?? false) : null,
      },
      body: (
        <NameCardBody
          group={g}
          p={p}
          stat={st}
          asOfDate={snapshot?.asOfDate ?? null}
          qs={qs}
          loggedIn={!!user}
          ent={ent}
          saved={savedNotice && savedHanja ? { ...savedNotice, givenHanja: savedHanja } : undefined}
          savedLookup={savedLookup}
        />
      ),
    };
  });

  // 순우리말 저장·로그인 후 돌아올 때 순우리말 탭이 열리도록
  const nativeQs = (() => {
    const q = new URLSearchParams(qs);
    q.set("tab", "native");
    return q.toString();
  })();
  const nativeItems: ResultItem[] = native.candidates.map((c) => ({
    hangul: c.legalName,
    metrics: c.metrics,
    // 강한 놀림말 이름은 맞춤 점수·정렬과 관계없이 맨 뒤 (compareNativeScore와 같은 규칙)
    demoted: c.score.teasing?.level === "strong",
    body: (
      <NativeCardBody
        candidate={c}
        surname={p.surname}
        stat={native.stats?.get(c.legalName)}
        statsLoaded={!!native.stats}
        asOfDate={snapshot?.asOfDate ?? null}
        qs={nativeQs}
        loggedIn={!!user}
        saved={savedNotice && savedNative === c.legalName ? savedNotice : undefined}
        savedId={savedLookup("native", null, c.legalName)}
      />
    ),
  }));
  const nativeNotices = native.notices.map((n) => (
    <p key={n} role="status" className="rounded-md bg-secondary p-3 text-sm">
      {n}
    </p>
  ));
  // 순우리말 이름으로 시작하면 입력 화면에 돌림자 칸이 없어 한자 탭에도 돌림자가 빠져 있다
  const startedNative = searchParams.tab === "native";
  const hanjaNotice = (
    <>
      {startedNative && !p.dolrimja && p.length !== "1" && (
        <p role="status" className="rounded-md bg-secondary p-3 text-sm">
          순우리말 이름으로 골라 돌림자 없이 추천했습니다. 돌림자를 넣으려면{" "}
          <Link href="/naming" className="text-primary underline">
            조건을 바꿔 주세요
          </Link>
          .
        </p>
      )}
      {result.notice && (
        <p role="status" className="rounded-md bg-secondary p-3 text-sm">
          {result.notice}
        </p>
      )}
    </>
  );

  return (
    <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      {backToSelf && (
        <Button asChild variant="outline" className="h-auto w-full justify-start whitespace-normal py-2.5 text-left sm:w-auto">
          <Link href={backToSelf.href}>
            ← &lsquo;{backToSelf.given}&rsquo; 직접 짓기로 돌아가기
          </Link>
        </Button>
      )}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-serif text-2xl font-bold break-keep sm:text-3xl">
            {p.surname}
            {p.surnameHanja && ` (${p.surnameHanja})`}씨
            {p.parentSurname && ` · ${p.parentSurname.hangul}(${p.parentSurname.hanja}) 함께 쓰기`} 추천 이름
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
          <Link href="/naming">다시 입력</Link>
        </Button>
      </header>

      <SurnameDefaultNote p={p} />

      {p.parentSurname && (
        <div role="note" className="space-y-1 rounded-md border p-4 text-sm">
          <p className="font-medium">출생신고 시에는 이렇게 등록됩니다</p>
          <p>
            부를 때는 &lsquo;{p.surname}
            {p.parentSurname.hangul}○○&rsquo;이지만, 성은 <b>{p.surname}({p.surnameHanja})</b> 하나로 등록하고{" "}
            <b>
              {p.parentSurname.hangul}○○({p.parentSurname.hanja}○○)
            </b>
            을 이름으로 등록합니다.
          </p>
          <p className="text-xs text-muted-foreground">{registrationCaveat(!ent.saju)}</p>
        </div>
      )}

      {result.combination && p.parentSurname && (
        <CombinationNote
          items={result.combination}
          label={`${p.surname} + ${p.parentSurname.hangul}`}
          locked={!ent.saju}
        />
      )}

      {searchParams.saveError && (
        <p role="alert" className="text-sm text-destructive">
          저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      )}

      <SajuCard saju={result.saju} p={p} detailed={ent.saju} />

      <section id="names" className="scroll-mt-16 space-y-4">
        <NamingTabs
          initialTab={startedNative ? "native" : "hanja"}
          loggedIn={!!user}
          saved={saved}
          sortOverride={p.rarity === "rare" ? "rare" : p.rarity === "common" ? "popular" : null}
          rareAvailable={!!result.stats}
          hanja={{
            items,
            limit: DISPLAY_LIMIT,
            intro: (
              <>
                {hanjaNotice}
                <p className="text-xs text-muted-foreground">
                  성명학 등급은 사주 보완 {SCORE_WEIGHTS.saju} · 수리 {SCORE_WEIGHTS.suri} · 발음오행{" "}
                  {SCORE_WEIGHTS.pronunciation} · 자원오행 {SCORE_WEIGHTS.resource}점 배점의 100점 만점 점수로
                  정합니다 (S {GRADE_MIN.S}점 이상 · A {GRADE_MIN.A}점 이상 · B {GRADE_MIN.B}점 이상 · 그 밖은 C).
                  맞춤 점수는 성명학 점수에 한자 뜻과 요즘 어감, 우리 집이 고른 항목의 가점을 더한 값으로 순서를
                  정하는 데만 쓰입니다. 같은 한글 이름의 한자 조합은 한 카드에 묶었습니다.
                </p>
                {result.stats && <DataSourceNote />}
              </>
            ),
            empty: (
              <>
                {hanjaNotice}
                <h2 className="font-serif text-2xl font-bold">추천 이름</h2>
                <p className="text-sm text-muted-foreground">
                  조건에 맞는 이름이 없습니다. 돌림자나 발음·남녀 공용 조건을 완화해 보세요.
                </p>
              </>
            ),
          }}
          native={{
            items: nativeItems,
            limit: NATIVE_DISPLAY_LIMIT,
            intro: (
              <>
                {nativeNotices}
                <p className="text-xs text-muted-foreground">
                  순우리말 이름은 한자가 없어 수리·자원오행 대신 소리와 뜻으로 봅니다. 우리말 이름 점수(100점)는 용신
                  보완 {NATIVE_SCORE_WEIGHTS.yongsin} · 발음오행 흐름 {NATIVE_SCORE_WEIGHTS.flow} · 뜻{" "}
                  {NATIVE_SCORE_WEIGHTS.meaning} · 부르기 쉬움 {NATIVE_SCORE_WEIGHTS.easy}점 배점이며, 한자 이름의 성명학
                  등급과 기준이 달라 등급을 붙이지 않습니다. 순우리말 이름은 모두 무료로 볼 수 있습니다.
                </p>
                <p className="text-xs text-muted-foreground">
                  발음오행으로 용신을 보완하는 방식은 학파에 따라 보는 비중이 다릅니다.
                </p>
                {native.stats && <DataSourceNote />}
              </>
            ),
            empty: (
              <>
                {nativeNotices}
                <h2 className="font-serif text-2xl font-bold">추천 이름</h2>
                <p className="text-sm text-muted-foreground">
                  조건에 맞는 순우리말 이름이 없습니다. 글자 수나 발음·남녀 공용 조건을 완화해 보세요.
                </p>
              </>
            ),
          }}
        />
      </section>
    </main>
  );
}
