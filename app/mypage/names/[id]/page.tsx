import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { GradeBadge, GyeokGrid, ScoreBreakdownLine } from "@/components/naming/analysis-parts";
import { CombinationNote } from "@/components/naming/combination-note";
import { DeleteSavedButton } from "@/components/mypage/delete-saved-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isUuid } from "@/lib/commerce/payment-sync";
import { birthTextOf } from "@/lib/commerce/report-snapshot";
import { LockedPreview } from "@/components/naming/locked-preview";
import { NativeScoreDetail } from "@/components/naming/native-card";
import { NativeCategoryBadge, NativeScoreBadge } from "@/components/naming/native-parts";
import { loadEntitlement } from "@/lib/commerce/entitlement";
import { CATEGORY_LABEL, NATIVE_SCORE_WEIGHTS } from "@/lib/naming/native/score";
import { namingConditionKey, parseNamingParams } from "@/lib/naming/params";
import { hunEum } from "@/lib/naming/recommend";
import { nativeRegistrationText, registrationCaveat, registrationText } from "@/lib/naming/registration";
import { savedNameMeaning } from "@/lib/naming/saved-meaning";
import { readSaved, SAVED_COLUMNS, savedResultHref, type SavedRow, type SavedSajuSummary } from "@/lib/naming/saved";
import type { NamingAnalysis } from "@/lib/naming/types";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "저장한 이름 | 이름핏" };
export const dynamic = "force-dynamic";

const ELEMENT_HANJA: Record<string, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };
const GENDER_LABEL = { male: "남자", female: "여자", neutral: "선택 안 함" } as const;

/** 저장 형식이 예전이라 값이 없는 항목 */
function NoRecord() {
  return <p className="text-sm text-muted-foreground">저장 당시 기록 없음</p>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <dt className="w-20 shrink-0 text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** 항목별 점수·4격은 무료, 발음·자원오행 흐름은 이 이름의 리포트를 결제했을 때만 (flows) */
function AnalysisDetail({ a, flows }: { a: NamingAnalysis; flows: boolean }) {
  return (
    <div className="space-y-2">
      <ScoreBreakdownLine analysis={a} />
      <GyeokGrid analysis={a} />
      {flows && (
        <p className="text-sm text-muted-foreground">
          발음오행 {a.pronunciation.elements.join("→")}
          {a.resource && ` · 자원오행 ${a.resource.elements.join("→")}`}
        </p>
      )}
    </div>
  );
}

type SavedYongsin = Pick<SavedSajuSummary, "strength" | "yongsin" | "huisin" | "gisin" | "method" | "geokguk">;

/** 사주 (한자·순우리말 공통). 격 이름·성격/파격은 같은 조건의 리포트를 결제했을 때만 (geokguk) */
function SajuCard({
  pillars,
  yongsin,
  geokguk,
  geokgukText,
}: {
  pillars: SavedSajuSummary["pillars"] | null;
  yongsin: SavedYongsin | null;
  geokguk: boolean;
  geokgukText: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>사주</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pillars ? (
          <div className="grid grid-cols-4 gap-2 text-center">
            {(
              [
                ["시주", pillars.hour],
                ["일주", pillars.day],
                ["월주", pillars.month],
                ["연주", pillars.year],
              ] as const
            ).map(([label, h]) => (
              <div key={label} className="rounded-md bg-secondary p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-serif text-2xl font-bold">{h ?? "미상"}</p>
              </div>
            ))}
          </div>
        ) : (
          <NoRecord />
        )}
        {yongsin && (
          <p className="text-sm">
            {yongsin.strength} · 용신{" "}
            <b>
              {ELEMENT_HANJA[yongsin.yongsin]}
              {yongsin.yongsin}
            </b>{" "}
            · 희신 {ELEMENT_HANJA[yongsin.huisin]}
            {yongsin.huisin} · 기신 {ELEMENT_HANJA[yongsin.gisin]}
            {yongsin.gisin}
            <span className="text-muted-foreground"> ({yongsin.method} 기준)</span>
          </p>
        )}
        {geokguk && yongsin?.geokguk && (
          <p className="text-sm text-muted-foreground">
            격국: {yongsin.geokguk.name} · {yongsin.geokguk.status}
            {!yongsin.geokguk.applied && " (용신은 강약 기준으로 정함)"}
          </p>
        )}
        {geokgukText && <p className="text-sm">{geokgukText}</p>}
      </CardContent>
    </Card>
  );
}

/**
 * 마이페이지에 저장한 이름 하나. 저장한 값만 그리고 지금 엔진으로 다시 계산하지 않는다 (lib/naming/saved.ts).
 * 최신 기준 결과는 "최신 기준으로 다시 분석"으로 결과 화면에서 본다.
 * 순우리말 이름은 4격·등급 없이 우리말 이름 점수로 따로 그리고, 모두 무료라 잠금·리포트 버튼이 없다.
 */
export default async function SavedNamePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/mypage/names/${params.id}`)}`);
  if (!isUuid(params.id)) notFound();

  // RLS 로 본인 저장분만 조회된다
  const { data: row } = await supabase
    .from("user_naming_history")
    .select(SAVED_COLUMNS)
    .eq("id", params.id)
    .maybeSingle();
  if (!row) notFound();

  const s = readSaved(row as SavedRow);
  const snap = s.snapshot;
  const parsed = s.qs ? parseNamingParams(Object.fromEntries(new URLSearchParams(s.qs))) : null;
  const p = parsed?.ok ? parsed.value : null;

  const fullName = `${s.surname}${s.given}`;
  const fullHanja = `${s.surnameHanja}${s.givenHanja}`;
  const birthText = snap?.birthText ?? (p ? birthTextOf(p) : null);
  const pillars = s.saju?.pillars ?? (snap ? {
    year: snap.saju.pillars.year.hanja,
    month: snap.saju.pillars.month.hanja,
    day: snap.saju.pillars.day.hanja,
    hour: snap.saju.pillars.hour?.hanja ?? null,
  } : null);
  const ys = snap?.saju.yongsin;
  const yongsin = s.saju ?? (ys ? {
    strength: ys.strength,
    yongsin: ys.yongsin,
    huisin: ys.huisin,
    gisin: ys.gisin,
    method: ys.method,
    geokguk: ys.geokguk ? { name: ys.geokguk.name, status: ys.geokguk.status, applied: ys.geokguk.applied } : null,
  } : null);
  const legal = s.legal ?? snap?.legalAnalysis ?? null;
  const combination = s.combination ?? snap?.texts.combination ?? null;
  const goodsHref = s.qs
    ? `/goods?${s.qs}&gh=${encodeURIComponent(s.givenHanja)}&ge=${encodeURIComponent(s.given)}&hid=${s.id}`
    : null;
  // 유료 내용: 이 저장 이름과 연결된 리포트이거나 같은 조건·같은 이름의 리포트를 결제했을 때만 그린다.
  // 순우리말 이름도 사주 쪽 유료 항목(격 이름·성격/파격)은 같은 조건의 리포트를 결제했을 때만 보인다
  const ent = await loadEntitlement(supabase, true, s.qs ? namingConditionKey(s.qs) : null, s.id);
  const nameOpen = ent.name(s.givenHanja, s.given);
  const lockHref = goodsHref ?? "/naming";
  const resultHref = savedResultHref(s);

  const birthCard = (
    <Card>
      <CardHeader>
        <CardTitle>입력 정보</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-1">
          <Row label="출생">{birthText ?? "저장 당시 기록 없음"}</Row>
          <Row label="성별">{p ? GENDER_LABEL[p.gender] : "저장 당시 기록 없음"}</Row>
        </dl>
      </CardContent>
    </Card>
  );
  const sajuCard = (
    <SajuCard pillars={pillars} yongsin={yongsin} geokguk={ent.saju} geokgukText={snap?.texts.geokguk ?? null} />
  );
  const deleteError = searchParams.deleteError && (
    <p role="alert" className="text-sm text-destructive">
      삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.
    </p>
  );

  if (s.kind === "native") {
    const n = s.native;
    return (
      <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
        <header className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link href="/mypage">← 마이페이지</Link>
          </Button>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <h1 className="font-serif text-3xl font-bold break-keep">
                {fullName}
                {s.isFavorite && " ★"}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">순우리말 이름</span>
                {n && <NativeCategoryBadge label={CATEGORY_LABEL[n.name.category]} />}
              </div>
              <p className="text-sm text-muted-foreground">
                {new Date(s.createdAt).toLocaleDateString("ko-KR")} 저장
              </p>
            </div>
            {n && <NativeScoreBadge total={n.score.total} />}
          </div>
          {s.parentSurname && (
            <p className="rounded-md bg-secondary p-3 text-sm break-keep">
              {nativeRegistrationText({ surname: s.surname, surnameHanja: s.surnameHanja, given: s.given })}
            </p>
          )}
          {deleteError}
        </header>

        <div className="flex flex-wrap gap-2">
          {resultHref ? (
            <Button asChild size="sm">
              <Link href={resultHref}>최신 기준으로 다시 분석</Link>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">입력 조건이 저장되지 않아 다시 분석할 수 없습니다.</p>
          )}
          <DeleteSavedButton id={s.id} name={fullName} />
        </div>
        <p className="text-xs text-muted-foreground">
          아래는 저장할 때의 분석입니다. 다시 분석하면 지금 기준으로 계산해 점수가 다를 수 있습니다. 순우리말 이름은 모두
          무료로 볼 수 있습니다.
        </p>

        {birthCard}

        <Card>
          <CardHeader>
            <CardTitle>이름 뜻</CardTitle>
          </CardHeader>
          <CardContent>{n ? <p className="text-sm break-keep">{n.name.meaning}</p> : <NoRecord />}</CardContent>
        </Card>

        {sajuCard}

        <Card>
          <CardHeader>
            <CardTitle>우리말 이름 점수</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {n ? <NativeScoreDetail score={n.score} globalScore={n.globalScore} /> : <NoRecord />}
            <p className="text-xs text-muted-foreground break-keep">
              용신 보완 {NATIVE_SCORE_WEIGHTS.yongsin} · 발음오행 흐름 {NATIVE_SCORE_WEIGHTS.flow} · 뜻{" "}
              {NATIVE_SCORE_WEIGHTS.meaning} · 부르기 쉬움 {NATIVE_SCORE_WEIGHTS.easy}점 배점의 100점 만점 점수입니다.
              한자 이름의 성명학 등급과 기준이 달라 등급을 붙이지 않습니다. 발음오행으로 용신을 보완하는 방식은 학파에
              따라 보는 비중이 다릅니다.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const nameMeaning = await savedNameMeaning(supabase, s);

  return (
    <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <header className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/mypage">← 마이페이지</Link>
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h1 className="font-serif text-3xl font-bold break-keep">
              {fullName}
              {s.isFavorite && " ★"}
            </h1>
            {fullHanja && <p className="font-serif text-xl text-muted-foreground">{fullHanja}</p>}
            <p className="text-sm text-muted-foreground">
              {new Date(s.createdAt).toLocaleDateString("ko-KR")} 저장
            </p>
          </div>
          {s.grade && s.totalScore != null && <GradeBadge grade={s.grade} score={s.totalScore} />}
        </div>
        {s.gradeFromScore && (
          <p className="text-xs text-muted-foreground">
            등급을 함께 저장하지 않던 때의 기록이라, 저장한 점수에 지금 등급 기준(S 92 · A 86 · B 80점 이상)을 적용했습니다.
          </p>
        )}
        {s.parentSurname && (
          <div className="space-y-1 rounded-md bg-secondary p-3 text-sm">
            <p>
              {registrationText({
                surname: s.surname,
                surnameHanja: s.surnameHanja,
                given: s.given,
                givenHanja: s.givenHanja,
              })}
            </p>
            <p className="text-xs text-muted-foreground">{registrationCaveat(!nameOpen)}</p>
          </div>
        )}
        {deleteError}
      </header>

      <div className="flex flex-wrap gap-2">
        {s.qs ? (
          <>
            <Button asChild size="sm">
              <Link href={resultHref!}>최신 기준으로 다시 분석</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={goodsHref!}>프리미엄 리포트 · 맞춤 굿즈</Link>
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            입력 조건이 저장되지 않아 다시 분석하거나 주문할 수 없습니다.
          </p>
        )}
        <DeleteSavedButton id={s.id} name={fullName} />
      </div>
      {s.qs && (
        <p className="text-xs text-muted-foreground">
          아래는 저장할 때의 분석입니다. 다시 분석하면 지금 기준으로 계산해 점수·등급이 다를 수 있고, 리포트는 결제할 때의
          기준으로 만들어집니다.
        </p>
      )}

      {birthCard}

      <Card>
        <CardHeader>
          <CardTitle>이름 한자</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {snap ? (
            <ul className="space-y-1 text-sm">
              {snap.given.map((c, i) => (
                <li key={`${c.hanja}${i}`}>
                  <span className="font-serif text-lg font-bold">{c.hanja}</span> {hunEum(c)} · {c.strokes}획
                  {c.element && ` · ${ELEMENT_HANJA[c.element]}${c.element}`}
                </li>
              ))}
            </ul>
          ) : (
            <NoRecord />
          )}
          {nameMeaning && (
            <p className="text-sm">
              <span className="text-muted-foreground">이름 뜻 · {nameMeaning.chars} →</span> {nameMeaning.sentence}
            </p>
          )}
        </CardContent>
      </Card>

      {sajuCard}

      <Card>
        <CardHeader>
          <CardTitle>성명학 점수</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {s.analysis ? <AnalysisDetail a={s.analysis} flows={nameOpen} /> : <NoRecord />}
          {s.analysis && !nameOpen && (
            <LockedPreview
              size="inline"
              what={s.parentSurname ? "발음·자원오행 흐름 · 법적 기준 상세" : "발음·자원오행 흐름"}
              href={lockHref}
            />
          )}
          {s.parentSurname && (
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">법적 이름 전체 기준 (참고)</p>
              {legal ? (
                <>
                  <p className="text-sm">
                    성 {s.surname}({s.surnameHanja}) · 이름 {s.given}({s.givenHanja}) 전체로 계산하면{" "}
                    <b>
                      {legal.grade}등급 {legal.totalScore.toFixed(1)}점
                    </b>
                    입니다.
                  </p>
                  {nameOpen && <AnalysisDetail a={legal} flows />}
                </>
              ) : (
                <NoRecord />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {s.parentSurname && combination && combination.length > 0 && (
        <CombinationNote
          items={combination}
          label={`${s.surname} + ${s.parentSurname.hangul}`}
          locked={!nameOpen}
        />
      )}
    </main>
  );
}
