import Link from "next/link";

import { saveName } from "@/app/naming/actions";
import { Button } from "@/components/ui/button";
import { NameStatsDetail, TierBadge } from "@/components/name-stats-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseNamingParams } from "@/lib/naming/params";
import { runNaming } from "@/lib/naming/service";
import { BRANCHES_KO, STEMS_KO, type Pillar } from "@/lib/saju";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "추천 결과 | 이름핏" };
export const dynamic = "force-dynamic";

const ELEMENT_HANJA: Record<string, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };
const GYEOK_LABEL = { won: "원격", hyeong: "형격", i: "이격", jeong: "정격" } as const;

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

  const { pillars, yongsin } = result.saju;
  const qs = new URLSearchParams(
    Object.entries(searchParams).flatMap(([k, v]) =>
      typeof v === "string" && k !== "saveError" ? [[k, v] as [string, string]] : []
    )
  ).toString();
  const total = Object.values(yongsin.scores).reduce((a, b) => a + b, 0);

  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-8 px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">
            {p.surname}
            {p.surnameHanja && ` (${p.surnameHanja})`}씨 추천 이름
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {p.birth.year}.{p.birth.month}.{p.birth.day}
            {p.hasTime
              ? ` ${String(p.birth.hour).padStart(2, "0")}:${String(p.birth.minute).padStart(2, "0")}`
              : " (시각 미상)"}{" "}
            · 월주 기준 절기 {result.saju.pillars.meta.monthTerm.ko}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/naming">다시 입력</Link>
        </Button>
      </header>

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
            합·충·형과 격국을 반영하지 않은 억부·조후 중심의 단순화된 풀이이며 참고용입니다.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="font-serif text-2xl font-bold">
          추천 이름 {result.recommendations.length}건
        </h2>
        {result.recommendations.length === 0 && (
          <p className="text-sm text-muted-foreground">
            조건에 맞는 이름이 없습니다. 돌림자나 글로벌 발음 조건을 완화해 보세요.
          </p>
        )}
        {result.recommendations.map((r, i) => {
          const a = r.analysis;
          const gh = r.givenName.map((c) => c.hanja).join("");
          return (
            <Card key={`${gh}-${i}`}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-serif text-2xl font-bold">
                      {p.surname}
                      {r.hangul}
                      <span className="ml-2 text-lg text-muted-foreground">
                        {p.surnameHanja}
                        {gh}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {r.givenName.map((c) => `${c.hanja} ${c.eum} ${c.strokes}획`).join(" · ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{a.totalScore}</p>
                    <p className="text-xs text-muted-foreground">종합 점수</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                  {(Object.keys(GYEOK_LABEL) as (keyof typeof GYEOK_LABEL)[]).map((k) => (
                    <p key={k}>
                      <span className="text-muted-foreground">{GYEOK_LABEL[k]}</span>{" "}
                      {a.fourGyeok[k].suri}수 {a.fourGyeok[k].lucky ? "길" : "흉"}
                    </p>
                  ))}
                </div>
                <p className="text-sm">
                  <span className="text-muted-foreground">발음오행</span>{" "}
                  {a.pronunciation.elements.join("→")}
                  {a.resource && (
                    <>
                      {" · "}
                      <span className="text-muted-foreground">자원오행</span>{" "}
                      {r.givenName.map((c) => c.element ?? "?").join("·")}
                      {a.resource.needMatched && " (용신 보강)"}
                    </>
                  )}
                  {" · "}
                  <span className="text-muted-foreground">글로벌 발음</span> {r.globalScore}
                </p>
                {(() => {
                  const st = result.stats?.get(r.hangul);
                  if (!st) return null;
                  return (
                    <details className="rounded-md border p-3 text-sm">
                      <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-muted-foreground">희소성</span>
                        <TierBadge tier={st.tier} />
                        {st.latest && (
                          <span className="text-muted-foreground">
                            {st.latest.year}년{" "}
                            {st.latest.listed
                              ? `${st.latest.total.toLocaleString("ko-KR")}명`
                              : `${st.latest.upperBound?.toLocaleString("ko-KR")}명 미만`}
                          </span>
                        )}
                        {st.neutral && <span className="text-muted-foreground">젠더 뉴트럴</span>}
                      </summary>
                      <div className="mt-3">
                        <NameStatsDetail stat={st} />
                      </div>
                    </details>
                  );
                })()}
                <ul className="text-xs text-muted-foreground">
                  {r.givenName.map((c) => (
                    <li key={c.hanja}>
                      {c.hanja} {c.eum}: {c.meaning ?? "-"}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-2">
                {user ? (
                  <form action={saveName}>
                    <input type="hidden" name="qs" value={qs} />
                    <input type="hidden" name="gh" value={gh} />
                    <input
                      type="hidden"
                      name="ge"
                      value={r.givenName.map((c) => c.eum).join("")}
                    />
                    <Button type="submit" size="sm" variant="secondary">
                      마이페이지에 저장
                    </Button>
                  </form>
                ) : (
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/login?next=${encodeURIComponent(`/naming/result?${qs}`)}`}>
                      로그인하고 저장
                    </Link>
                  </Button>
                )}
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={`/goods?${qs}&gh=${encodeURIComponent(gh)}&ge=${encodeURIComponent(
                      r.givenName.map((c) => c.eum).join("")
                    )}`}
                  >
                    리포트 · 맞춤 굿즈
                  </Link>
                </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
