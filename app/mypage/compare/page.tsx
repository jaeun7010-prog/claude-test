import Link from "next/link";
import { redirect } from "next/navigation";

import { DataSourceNote } from "@/components/data-source-note";
import { GradeBadge, gyeokText } from "@/components/naming/analysis-parts";
import { NativeScoreBadge } from "@/components/naming/native-parts";
import { Button } from "@/components/ui/button";
import { isUuid } from "@/lib/commerce/payment-sync";
import { birthTextOf } from "@/lib/commerce/report-snapshot";
import { formatAsOfDate, getLatestSnapshot } from "@/lib/name-stats/snapshot";
import { COMPARE_MAX } from "@/lib/naming/compare";
import { namingConditionKey, parseNamingParams } from "@/lib/naming/params";
import { CATEGORY_LABEL, type NativeScore } from "@/lib/naming/native/score";
import { rarityStage } from "@/lib/naming/priorities";
import { readSaved, SAVED_COLUMNS, type SavedNaming, type SavedRow } from "@/lib/naming/saved";
import { savedNameMeaning } from "@/lib/naming/saved-meaning";
import type { FourGyeokKey, ScoreBreakdown } from "@/lib/naming/types";
import { loadNameSummaries } from "@/lib/stats/name-stats";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "이름 나란히 비교 | 이름핏" };
export const dynamic = "force-dynamic";

const BREAKDOWN: [keyof ScoreBreakdown, string][] = [
  ["saju", "사주 보완"],
  ["suri", "수리"],
  ["pronunciation", "발음오행"],
  ["resource", "자원오행"],
];
const GYEOK: [FourGyeokKey, string][] = [
  ["won", "원격"],
  ["hyeong", "형격"],
  ["i", "이격"],
  ["jeong", "정격"],
];
/** 순우리말 이름의 항목별 점수 (우리말 이름 점수) */
const NATIVE_ITEMS: [keyof NativeScore["items"], string][] = [
  ["yongsin", "용신 보완"],
  ["flow", "발음오행 흐름"],
  ["meaning", "뜻"],
  ["easy", "부르기 쉬움"],
];

function NotApplicable() {
  return <span className="text-muted-foreground">해당 없음</span>;
}

function Notice({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-6 py-12">
      <p role="alert">{message}</p>
      <Button asChild>
        <Link href="/mypage">마이페이지로 돌아가기</Link>
      </Button>
    </main>
  );
}

/** 열마다 숫자를 비교해 가장 높은 값만 굵게 (모두 같으면 강조 없음) */
const bestOf = (values: (number | null)[]) => {
  const nums = values.filter((v): v is number => v != null);
  const max = Math.max(...nums);
  return nums.length > 1 && nums.some((v) => v !== max) ? max : null;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-t align-top">
      <th scope="row" className="w-24 whitespace-nowrap py-3 pr-3 text-left text-xs font-medium text-muted-foreground">
        {label}
      </th>
      {children}
    </tr>
  );
}

const cell = "min-w-[9rem] px-3 py-3 text-sm";

/**
 * 저장한 이름 2~3개를 나란히 비교 (무료 항목만): 등급·성명학 점수, 이름 뜻, 항목별 점수, 4격, 법적 기준 등급·총점, 희소성.
 * 점수는 저장할 때 값이고, 희소성만 지금 통계(기준일 표기)로 본다.
 * 순우리말 이름은 우리말 이름 점수와 그 항목을 보여 준다. 한자 이름과 섞이면 점수 기준이 달라 "가장 높음"을 붙이지 않는다.
 */
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const raw = Array.isArray(searchParams.ids) ? searchParams.ids[0] : (searchParams.ids ?? "");
  const ids = [...new Set(raw.split(",").filter(isUuid))];

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/mypage/compare?ids=${ids.join(",")}`)}`);
  if (ids.length < 2 || ids.length > COMPARE_MAX)
    return <Notice message={`비교할 이름을 2~${COMPARE_MAX}개 골라 주세요.`} />;

  // RLS 로 본인 저장분만 조회된다
  const { data: rows } = await supabase.from("user_naming_history").select(SAVED_COLUMNS).in("id", ids);
  const byId = new Map((rows ?? []).map((r) => [r.id, readSaved(r as SavedRow)]));
  const items = ids.map((id) => byId.get(id)).filter((x): x is SavedNaming => !!x);
  if (items.length < 2) return <Notice message="저장한 이름을 찾을 수 없습니다. 목록에서 다시 골라 주세요." />;

  const [meanings, stats, snapshot] = await Promise.all([
    Promise.all(items.map((s) => savedNameMeaning(supabase, s))),
    loadNameSummaries(
      supabase,
      items.map((s) => s.given),
    ).catch((e) => {
      console.error("[compare] 통계 조회 실패", e);
      return null;
    }),
    getLatestSnapshot(),
  ]);

  const conditions = items.map((s) => (s.qs ? namingConditionKey(s.qs) : null));
  const mixed = new Set(conditions).size > 1 || conditions.includes(null);
  const births = items.map((s) => {
    if (s.snapshot) return s.snapshot.birthText;
    const parsed = s.qs ? parseNamingParams(Object.fromEntries(new URLSearchParams(s.qs))) : null;
    return parsed?.ok ? birthTextOf(parsed.value) : null;
  });
  const anyParent = items.some((s) => s.parentSurname);
  const anyHanja = items.some((s) => s.kind === "hanja");
  const anyNative = items.some((s) => s.kind === "native");
  const mixedKinds = anyHanja && anyNative;
  // 한자 이름은 성명학 점수, 순우리말 이름은 우리말 이름 점수. 기준이 달라 섞이면 비교하지 않는다
  const scoreOf = (s: SavedNaming) => (s.kind === "native" ? (s.native?.score.total ?? null) : s.totalScore);
  const topScore = mixedKinds ? null : bestOf(items.map(scoreOf));

  return (
    <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-4xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <header className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/mypage">← 마이페이지</Link>
        </Button>
        <h1 className="font-serif text-3xl font-bold">이름 나란히 비교</h1>
        <p className="text-sm text-muted-foreground">
          점수는 저장할 때의 값입니다. 가장 높은 점수는 굵게 표시했습니다.
        </p>
        {mixedKinds && (
          <p role="note" className="rounded-md bg-secondary p-3 text-sm break-keep">
            한자 이름(성명학 점수)과 순우리말 이름(우리말 이름 점수)이 섞여 있습니다. 점수 기준이 달라 직접 비교하기
            어렵습니다.
          </p>
        )}
        {mixed && (
          <p role="note" className="rounded-md bg-secondary p-3 text-sm">
            생년월일·출생지 등 입력 조건이 다른 이름이 섞여 있습니다. 사주 보완 점수는 아이의 사주에 따라 달라지므로
            조건이 다른 이름끼리는 그대로 비교하기 어렵습니다.
          </p>
        )}
      </header>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <td />
              {items.map((s) => (
                <th key={s.id} scope="col" className={`${cell} text-left align-top`}>
                  <Link href={`/mypage/names/${s.id}`} className="group block">
                    <span className="block font-serif text-xl font-bold group-hover:underline">
                      {s.surname}
                      {s.given}
                    </span>
                    <span className="block font-serif font-normal text-muted-foreground">
                      {s.kind === "native" ? "순우리말 이름" : `${s.surnameHanja}${s.givenHanja}`}
                    </span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label="등급·점수">
              {items.map((s) => (
                <td key={s.id} className={cell}>
                  {s.kind === "native" ? (
                    s.native ? (
                      <div className="flex items-center gap-2">
                        <NativeScoreBadge total={s.native.score.total} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {s.native.score.total.toFixed(1)}점 (등급 없음)
                          {topScore != null && s.native.score.total === topScore && (
                            <span className="block font-medium text-primary">가장 높음</span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">저장 당시 기록 없음</span>
                    )
                  ) : s.grade && s.totalScore != null ? (
                    <div className="flex items-center gap-2">
                      <GradeBadge grade={s.grade} score={s.totalScore} size="sm" />
                      {topScore != null && s.totalScore === topScore && (
                        <span className="text-xs font-medium text-primary">가장 높음</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">저장 당시 기록 없음</span>
                  )}
                </td>
              ))}
            </Row>
            <Row label="이름 뜻">
              {items.map((s, i) => (
                <td key={s.id} className={`${cell} break-keep`}>
                  {s.native ? (
                    <>
                      <span className="block text-xs text-muted-foreground">
                        {CATEGORY_LABEL[s.native.name.category]}
                      </span>
                      {s.native.name.meaning}
                    </>
                  ) : meanings[i] ? (
                    <>
                      <span className="block text-xs text-muted-foreground">{meanings[i]!.chars}</span>
                      {meanings[i]!.sentence}
                    </>
                  ) : (
                    <span className="text-muted-foreground">한 줄 뜻 없음 (훈음만)</span>
                  )}
                </td>
              ))}
            </Row>
            {anyHanja &&
              BREAKDOWN.map(([k, label]) => {
                const values = items.map((s) => (s.analysis ? s.analysis.breakdown[k] : null));
                const best = bestOf(values);
                return (
                  <Row key={k} label={label}>
                    {values.map((v, i) => (
                      <td
                        key={items[i].id}
                        className={`${cell} tabular-nums ${best != null && v === best ? "font-bold" : ""}`}
                      >
                        {items[i].kind === "native" ? (
                          <NotApplicable />
                        ) : v == null ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          Math.round(v)
                        )}
                      </td>
                    ))}
                  </Row>
                );
              })}
            {anyNative &&
              NATIVE_ITEMS.map(([k, label]) => {
                const values = items.map((s) => s.native?.score.items[k].score ?? null);
                const best = bestOf(values);
                return (
                  <Row key={k} label={label}>
                    {values.map((v, i) => (
                      <td
                        key={items[i].id}
                        className={`${cell} tabular-nums ${best != null && v === best ? "font-bold" : ""}`}
                      >
                        {items[i].kind !== "native" ? (
                          <NotApplicable />
                        ) : v == null ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          Math.round(v)
                        )}
                      </td>
                    ))}
                  </Row>
                );
              })}
            {anyHanja && (
              <Row label="4격 수리">
                {items.map((s) => (
                  <td key={s.id} className={`${cell} tabular-nums`}>
                    {s.kind === "native" ? (
                      <NotApplicable />
                    ) : s.analysis ? (
                      <ul className="space-y-0.5">
                        {GYEOK.map(([k, label]) => (
                          <li key={k}>
                            <span className="text-muted-foreground">{label}</span> {gyeokText(s.analysis!.fourGyeok[k])}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground">저장 당시 기록 없음</span>
                    )}
                  </td>
                ))}
              </Row>
            )}
            {anyParent && anyHanja && (
              <Row label="법적 이름 기준">
                {items.map((s) => (
                  <td key={s.id} className={`${cell} tabular-nums`}>
                    {!s.parentSurname || s.kind === "native" ? (
                      <span className="text-muted-foreground">해당 없음</span>
                    ) : s.legal ? (
                      `${s.legal.grade}등급 ${s.legal.totalScore.toFixed(1)}점`
                    ) : (
                      <span className="text-muted-foreground">저장 당시 기록 없음</span>
                    )}
                  </td>
                ))}
              </Row>
            )}
            <Row label="희소성">
              {items.map((s) => {
                const st = stats?.summaries.get(s.given);
                const stage = st
                  ? rarityStage({
                      births: st.cumulative.male + st.cumulative.female,
                      everListed: st.everListed,
                    })
                  : null;
                return (
                  <td key={s.id} className={cell}>
                    {st && stage ? (
                      <>
                        {stage}
                        <span className="block text-xs text-muted-foreground tabular-nums">
                          {st.cumulative.male + st.cumulative.female > 0
                            ? `누적 ${(st.cumulative.male + st.cumulative.female).toLocaleString("ko-KR")}명`
                            : "상위 목록 밖"}
                          {snapshot && ` · ${formatAsOfDate(snapshot.asOfDate)} 기준`}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">통계 준비 중</span>
                    )}
                  </td>
                );
              })}
            </Row>
            <Row label="출생">
              {births.map((b, i) => (
                <td key={items[i].id} className={`${cell} text-muted-foreground`}>
                  {b ?? "저장 당시 기록 없음"}
                </td>
              ))}
            </Row>
            <Row label="저장일">
              {items.map((s) => (
                <td key={s.id} className={`${cell} text-muted-foreground`}>
                  {new Date(s.createdAt).toLocaleDateString("ko-KR")}
                </td>
              ))}
            </Row>
          </tbody>
        </table>
      </div>
      {stats ? (
        <DataSourceNote />
      ) : (
        <p className="text-xs text-muted-foreground">
          이름 통계(대법원 출생신고 자료)를 반영하기 전이라 희소성은 아직 보여 드릴 수 없습니다.
        </p>
      )}
    </main>
  );
}
