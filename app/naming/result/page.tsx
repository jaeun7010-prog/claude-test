import Link from "next/link";

import { saveName } from "@/app/naming/actions";
import { Button } from "@/components/ui/button";
import { DataSourceNote } from "@/components/data-source-note";
import { NameStatsBasic } from "@/components/name-stats-basic";
import { TierBadge } from "@/components/name-stats-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResultList, type ResultItem } from "@/components/naming/result-list";
import { CombinationNote } from "@/components/naming/combination-note";
import { GeokgukNote } from "@/components/naming/geokguk-note";
import { RelationsNote } from "@/components/naming/relations-note";
import { TimeCorrectionNote } from "@/components/naming/time-correction-note";
import { parseNamingParams, type NamingParams } from "@/lib/naming/params";
import { parsePriorities, type Priorities } from "@/lib/naming/priorities";
import { hunEum, type NameGroup, type Recommendation } from "@/lib/naming/recommend";
import { REGISTRATION_CAVEAT, registrationText } from "@/lib/naming/registration";
import { GRADE_MIN, SCORE_WEIGHTS } from "@/lib/naming/score";
import type { Grade, NamingAnalysis } from "@/lib/naming/types";
import { DISPLAY_LIMIT, runNaming } from "@/lib/naming/service";
import type { NameStatSummary } from "@/lib/stats/name-stats";
import { getLatestSnapshot } from "@/lib/name-stats/snapshot";
import { BRANCHES_KO, STEMS_KO, type Pillar } from "@/lib/saju";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "추천 결과 | 이름핏" };
export const dynamic = "force-dynamic";

const ELEMENT_HANJA: Record<string, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };
const GYEOK_LABEL = { won: "원격", hyeong: "형격", i: "이격", jeong: "정격" } as const;

const hanjaOf = (r: Recommendation) => r.givenName.map((c) => c.hanja).join("");
const eumOf = (r: Recommendation) => r.givenName.map((c) => c.eum).join("");
const charLine = (r: Recommendation) =>
  r.givenName.map((c) => `${c.hanja} ${hunEum(c)} ${c.strokes}획`).join(" · ");

const GRADE_STYLE: Record<Grade, string> = {
  S: "border-primary bg-primary text-primary-foreground",
  A: "border-primary text-primary",
  B: "border-transparent bg-secondary text-foreground",
  C: "border-border text-muted-foreground",
};

/** 성명학 등급을 크게, 점수를 작게 */
function GradeBadge({ grade, score, size = "lg" }: { grade: Grade; score: number; size?: "lg" | "sm" }) {
  const box = size === "lg" ? "h-14 w-14 text-3xl" : "h-10 w-10 text-xl";
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <span
        className={`flex items-center justify-center rounded-full border-2 font-serif font-bold ${box} ${GRADE_STYLE[grade]}`}
        aria-label={`성명학 ${grade}등급`}
      >
        {grade}
      </span>
      <span className="text-xs text-muted-foreground">{score.toFixed(1)}점</span>
    </div>
  );
}

const BREAKDOWN_LABEL: [keyof NamingAnalysis["breakdown"], string][] = [
  ["saju", "사주 보완"],
  ["suri", "수리"],
  ["pronunciation", "발음오행"],
  ["resource", "자원오행"],
];

/** 항목별 점수 (작게) */
function ScoreBreakdownLine({ analysis }: { analysis: NamingAnalysis }) {
  return (
    <p className="text-xs text-muted-foreground">
      {BREAKDOWN_LABEL.map(([k, label]) => {
        const v = analysis.breakdown[k];
        return `${label} ${v === null ? "-" : Math.round(v)}`;
      }).join(" · ")}
    </p>
  );
}

/** 원/형/이/정 4격 수리와 길흉 */
function GyeokGrid({ analysis }: { analysis: NamingAnalysis }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
      {(Object.keys(GYEOK_LABEL) as (keyof typeof GYEOK_LABEL)[]).map((k) => (
        <p key={k}>
          <span className="text-muted-foreground">{GYEOK_LABEL[k]}</span> {analysis.fourGyeok[k].suri}수{" "}
          {analysis.fourGyeok[k].lucky ? "길" : "흉"}
        </p>
      ))}
    </div>
  );
}

/** 부모 성 함께 쓰기: 법적 이름 전체 기준 점수 (참고). 등급은 새로 고르는 부분 기준이라 따로 보여 준다 */
function LegalDetails({ r, p }: { r: Recommendation; p: NamingParams }) {
  const l = r.legalAnalysis;
  if (!l) return null;
  return (
    <details className="rounded-md border">
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-primary">
        자세히 보기: 법적 이름 전체 기준 (참고)
      </summary>
      <div className="space-y-2 border-t p-3 text-sm">
        <p>
          성 {p.surname}({p.surnameHanja}) · 이름 {eumOf(r)}({hanjaOf(r)}) 전체로 계산하면{" "}
          <b>
            {l.grade}등급 {l.totalScore.toFixed(1)}점
          </b>
          입니다.
        </p>
        <ScoreBreakdownLine analysis={l} />
        <GyeokGrid analysis={l} />
        <p className="text-muted-foreground">
          발음오행 {l.pronunciation.elements.join("→")}
          {l.resource && ` · 자원오행 ${l.resource.elements.join("→")}`}
        </p>
      </div>
    </details>
  );
}

function MeaningList({ r }: { r: Recommendation }) {
  return (
    <ul className="text-xs text-muted-foreground">
      {r.givenName.map((c) => (
        <li key={c.hanja}>
          {c.hanja} {hunEum(c)}
          {/* 훈 데이터가 없는 글자는 영문 뜻풀이를 참고용으로 보여 준다 */}
          {!c.hun && c.meaning ? ` — ${c.meaning}` : ""}
        </li>
      ))}
    </ul>
  );
}

function OptionActions({ r, qs, loggedIn }: { r: Recommendation; qs: string; loggedIn: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {loggedIn ? (
        <form action={saveName}>
          <input type="hidden" name="qs" value={qs} />
          <input type="hidden" name="gh" value={hanjaOf(r)} />
          <input type="hidden" name="ge" value={eumOf(r)} />
          <Button type="submit" size="sm" variant="secondary">
            마이페이지에 저장
          </Button>
        </form>
      ) : (
        <Button asChild size="sm" variant="secondary">
          <Link href={`/login?next=${encodeURIComponent(`/naming/result?${qs}`)}`}>로그인하고 저장</Link>
        </Button>
      )}
      <Button asChild size="sm" variant="outline">
        <Link href={`/goods?${qs}&gh=${encodeURIComponent(hanjaOf(r))}&ge=${encodeURIComponent(eumOf(r))}`}>
          리포트 · 맞춤 굿즈
        </Link>
      </Button>
    </div>
  );
}

/** 이름 카드 본문 (서버에서 그려 ResultList 에 넘긴다) */
function NameCardBody({
  group: g,
  p,
  stat: st,
  asOfDate,
  qs,
  loggedIn,
}: {
  group: NameGroup;
  p: NamingParams;
  stat: NameStatSummary | undefined;
  asOfDate: string | null;
  qs: string;
  loggedIn: boolean;
}) {
  const [best, ...others] = g.options;
  const a = best.analysis;
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-serif text-2xl font-bold">
            {p.surname}
            {g.hangul}
            <span className="ml-2 text-lg text-muted-foreground">
              {p.surnameHanja}
              {hanjaOf(best)}
            </span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{charLine(best)}</p>
          {p.parentSurname && (
            <p className="mt-1 text-xs text-muted-foreground">
              {registrationText({
                surname: p.surname,
                surnameHanja: p.surnameHanja,
                given: eumOf(best),
                givenHanja: hanjaOf(best),
              })}
            </p>
          )}
        </div>
        <GradeBadge grade={a.grade} score={a.totalScore} />
      </div>

      <ScoreBreakdownLine analysis={a} />
      {p.parentSurname && (
        <p className="text-xs text-muted-foreground">
          등급은 새로 고르는 부분 기준입니다 (성과 함께 쓰는 부모 성을 하나의 성처럼 보고 계산).
        </p>
      )}

      <GyeokGrid analysis={a} />
      <p className="text-sm">
        <span className="text-muted-foreground">발음오행</span> {a.pronunciation.elements.join("→")}
        {a.resource && (
          <>
            {" · "}
            <span className="text-muted-foreground">자원오행</span>{" "}
            {best.givenName.map((c) => c.element ?? "?").join("·")}
            {a.resource.needMatched && " (용신 보강)"}
            {a.resource.arrangement === "통관" && " · 성씨와 용신을 잇는 배치(통관)"}
            {a.resource.arrangement === "희신 배치" && " · 용신을 돕는 기운을 사이에 둔 배치"}
          </>
        )}
        {" · "}
        <span className="text-muted-foreground">글로벌 발음</span> {best.globalScore}
      </p>
      {st && (
        <div className="space-y-2 rounded-md border p-3">
          <NameStatsBasic stat={st} asOfDate={asOfDate} />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-muted-foreground">희소성</span>
            <TierBadge tier={st.tier} />
            {st.neutral && <span className="text-muted-foreground">남녀 공용</span>}
            <Link href={`/stats?name=${encodeURIComponent(g.hangul)}`} className="ml-auto text-primary underline">
              연도별 상세 통계
            </Link>
          </div>
        </div>
      )}
      <MeaningList r={best} />
      <LegalDetails r={best} p={p} />

      <OptionActions r={best} qs={qs} loggedIn={loggedIn} />

      {others.length > 0 && (
        <details className="group rounded-md border">
          <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-primary">
            <span className="group-open:hidden">다른 한자 조합 {others.length}개 보기</span>
            <span className="hidden group-open:inline">다른 한자 조합 접기</span>
          </summary>
          <ul className="divide-y border-t">
            {others.map((r) => (
              <li key={hanjaOf(r)} className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-serif text-lg font-bold">
                      {p.surnameHanja}
                      {hanjaOf(r)}
                    </p>
                    <p className="text-sm text-muted-foreground">{charLine(r)}</p>
                  </div>
                  <GradeBadge grade={r.analysis.grade} score={r.analysis.totalScore} size="sm" />
                </div>
                <ScoreBreakdownLine analysis={r.analysis} />
                <MeaningList r={r} />
                <LegalDetails r={r} p={p} />
                <OptionActions r={r} qs={qs} loggedIn={loggedIn} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

function PillarCell({ label, pillar }: { label: string; pillar: Pillar | null }) {
  return (
    <div className="rounded-md bg-secondary p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      {pillar ? (
        <>
          <p className="font-serif text-2xl font-bold">{pillar.hanja}</p>
          <p className="text-xs text-muted-foreground">
            {STEMS_KO[pillar.stem]}
            {BRANCHES_KO[pillar.branch]}
          </p>
        </>
      ) : (
        <p className="py-3 text-sm text-muted-foreground">미상</p>
      )}
    </div>
  );
}

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

  const snapshot = result.stats ? await getLatestSnapshot() : null;

  const { pillars, yongsin } = result.saju;
  const qs = new URLSearchParams(
    Object.entries(searchParams).flatMap(([k, v]) =>
      typeof v === "string" && k !== "saveError" ? [[k, v] as [string, string]] : []
    )
  ).toString();
  const total = Object.values(yongsin.scores).reduce((a, b) => a + b, 0);

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
        />
      ),
    };
  });

  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-8 px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">
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
          <p className="text-xs text-muted-foreground">{REGISTRATION_CAVEAT}</p>
        </div>
      )}

      {result.combination && p.parentSurname && (
        <CombinationNote items={result.combination} label={`${p.surname} + ${p.parentSurname.hangul}`} />
      )}

      {result.notice && (
        <p role="status" className="rounded-md bg-secondary p-3 text-sm">
          {result.notice}
        </p>
      )}

      {searchParams.saveError && (
        <p role="alert" className="text-sm text-destructive">
          저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>사주 원국</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-4 gap-3">
            <PillarCell label="시주" pillar={pillars.hour} />
            <PillarCell label="일주" pillar={pillars.day} />
            <PillarCell label="월주" pillar={pillars.month} />
            <PillarCell label="연주" pillar={pillars.year} />
          </div>

          <TimeCorrectionNote
            correction={result.saju.timeCorrection}
            birthplace={p.birthplace}
            input={p.hasTime ? { hour: p.birth.hour!, minute: p.birth.minute ?? 0 } : null}
            hourPillar={pillars.hour}
            dayPillar={pillars.day}
          />

          <div className="space-y-2">
            {(["목", "화", "토", "금", "수"] as const).map((e) => (
              <div key={e} className="flex items-center gap-3 text-sm">
                <span className="w-8 font-serif">
                  {ELEMENT_HANJA[e]}
                  {e}
                </span>
                <div className="h-2 flex-1 rounded-full bg-secondary">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${Math.round((yongsin.scores[e] / total) * 100)}%` }}
                  />
                </div>
                <span className="w-10 text-right text-muted-foreground">
                  {Math.round((yongsin.scores[e] / total) * 100)}%
                </span>
              </div>
            ))}
          </div>

          <RelationsNote relations={yongsin.relations} rawScores={yongsin.rawScores} scores={yongsin.scores} />
          <GeokgukNote yongsin={yongsin} />

          <div className="rounded-md border p-4 text-sm">
            <p>
              일간 <b>{ELEMENT_HANJA[yongsin.dayMaster.element]}{yongsin.dayMaster.element}</b> ·{" "}
              <b>{yongsin.strength}</b> · 용신 <b>{ELEMENT_HANJA[yongsin.yongsin]}{yongsin.yongsin}</b>{" "}
              <span className="text-muted-foreground">({yongsin.method}용신)</span>
            </p>
            <p className="mt-1 text-muted-foreground">
              희신 {yongsin.huisin} · 피하면 좋은 기운 {yongsin.gisin}
            </p>
            <p className="mt-2 text-muted-foreground">{yongsin.reason}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            사주의 강약, 계절 균형, 합충, 격국을 기준으로 아이에게 필요한 기운을 찾았습니다. 학파에 따라 해석이 다를 수
            있습니다.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-4">
        {result.groups.length === 0 ? (
          <>
            <h2 className="font-serif text-2xl font-bold">추천 이름</h2>
            <p className="text-sm text-muted-foreground">
              조건에 맞는 이름이 없습니다. 돌림자나 발음·남녀 공용 조건을 완화해 보세요.
            </p>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              성명학 등급은 사주 보완 {SCORE_WEIGHTS.saju} · 수리 {SCORE_WEIGHTS.suri} · 발음오행{" "}
              {SCORE_WEIGHTS.pronunciation} · 자원오행 {SCORE_WEIGHTS.resource}점 배점의 100점 만점 점수로
              정합니다 (S {GRADE_MIN.S}점 이상 · A {GRADE_MIN.A}점 이상 · B {GRADE_MIN.B}점 이상 · 그 밖은 C).
              맞춤 점수는 성명학 점수에 한자 뜻과 요즘 어감, 우리 집이 고른 항목의 가점을 더한 값으로 순서를
              정하는 데만 쓰입니다. 같은 한글 이름의 한자 조합은 한 카드에 묶었습니다.
            </p>
            {result.stats && <DataSourceNote />}
            <ResultList
              items={items}
              limit={DISPLAY_LIMIT}
              loggedIn={!!user}
              saved={saved}
              sortOverride={p.rarity === "rare" ? "rare" : p.rarity === "common" ? "popular" : null}
              rareAvailable={!!result.stats}
            />
          </>
        )}
      </section>
    </main>
  );
}
