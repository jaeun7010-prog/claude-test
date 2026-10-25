import Link from "next/link";

import { saveName, saveSelfName } from "@/app/naming/actions";
import { Button } from "@/components/ui/button";
import { NameStatsBasic } from "@/components/name-stats-basic";
import { TierBadge } from "@/components/name-stats-chart";
import { GradeBadge, GyeokGrid, ScoreBreakdownLine } from "@/components/naming/analysis-parts";
import { LockedPreview } from "@/components/naming/locked-preview";
import { SavedStatus, type SavedNotice } from "@/components/naming/saved-status";
import type { Entitlement } from "@/lib/commerce/entitlement";
import type { NamingParams } from "@/lib/naming/params";
import { nameMeaningOf } from "@/lib/naming/name-meaning";
import { hanjaDetailOf } from "@/lib/naming/hanja-detail";
import { hunEum, type NameGroup, type Recommendation } from "@/lib/naming/recommend";
import { registrationText } from "@/lib/naming/registration";
import type { NameStatSummary } from "@/lib/stats/name-stats";

/** 한자 이름 카드 (추천 결과 화면). 셀프 작명 결과 화면에서도 함께 쓴다 */

const ELEMENT_HANJA: Record<string, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };

export const hanjaOf = (r: Recommendation) => r.givenName.map((c) => c.hanja).join("");
export const eumOf = (r: Recommendation) => r.givenName.map((c) => c.eum).join("");
export const goodsHref = (qs: string, r: Recommendation) =>
  `/goods?${qs}&gh=${encodeURIComponent(hanjaOf(r))}&ge=${encodeURIComponent(eumOf(r))}`;

/** 부모 성 함께 쓰기: 법적 이름 전체 기준 점수 (참고). 등급은 새로 고르는 부분 기준이라 따로 보여 준다 */
function LegalDetails({ r, p, unlocked }: { r: Recommendation; p: NamingParams; unlocked: boolean }) {
  const l = r.legalAnalysis;
  if (!l) return null;
  // 등급·총점은 무료, 항목별 점수·4격·오행 흐름은 이 이름의 리포트를 결제해야 그린다
  if (!unlocked) {
    return (
      <p className="text-xs text-muted-foreground">
        법적 이름 전체 기준 (참고): {l.grade}등급 {l.totalScore.toFixed(1)}점 · 상세는 프리미엄 리포트에 있습니다
      </p>
    );
  }
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

/**
 * 이름 한자 (마이페이지 "이름 한자" 칸과 같은 모양): 글자마다 훈음·획수, 그 아래 이름 뜻 한 줄.
 * 글자별 자원오행은 "자원오행 흐름"(유료)에 들어가므로 결제 후에만 붙인다.
 * 글자 상세 풀이(hanja-detail.ts, 요약 + 풀이)도 결제 후에만 보여 준다.
 * 이름 뜻은 부모 성 함께 쓰기면 새로 고르는 글자만 보고, 문장이 없으면 그리지 않는다.
 */
function HanjaChars({ r, p, unlocked }: { r: Recommendation; p: NamingParams; unlocked: boolean }) {
  const m = nameMeaningOf(r.givenName.slice(p.parentSurname ? [...p.parentSurname.hanja].length : 0));
  return (
    <div className="mt-2 space-y-1 text-sm">
      <ul className="space-y-0.5">
        {r.givenName.map((c, i) => {
          const d = unlocked ? hanjaDetailOf(c) : null;
          return (
            <li key={`${c.hanja}${i}`}>
              <span className="font-serif font-bold">{c.hanja}</span> {hunEum(c)} · {c.strokes}획
              {unlocked && c.element && ` · ${ELEMENT_HANJA[c.element]}`}
              {d && (
                <span className="block pl-5 text-xs text-muted-foreground break-keep">
                  <b className="font-medium text-foreground">{d.summary}</b> — {d.text}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {m && (
        <p>
          <span className="text-muted-foreground">이름 뜻 ·</span> {m.sentence}
        </p>
      )}
    </div>
  );
}

/** 셀프 작명(직접 짓기) 결과 화면: 저장·로그인 후 이 주소로 돌아온다 */
export interface SelfCardMode {
  resultHref: string;
  /** 새로 고르는 부분 (부모 성 글자 제외) */
  given: string;
  givenHanja: string;
}

function OptionActions({
  r,
  qs,
  loggedIn,
  self,
  saved,
}: {
  r: Recommendation;
  qs: string;
  loggedIn: boolean;
  self?: SelfCardMode;
  saved?: SavedNotice;
}) {
  const back = self ? self.resultHref : `/naming/result?${qs}`;
  return (
    <>
      {saved && <SavedStatus saved={saved} />}
      <div className="flex flex-wrap gap-2">
        {loggedIn ? (
          <form action={self ? saveSelfName : saveName}>
            <input type="hidden" name="qs" value={qs} />
            {self ? (
              <>
                <input type="hidden" name="given" value={self.given} />
                <input type="hidden" name="hj" value={self.givenHanja} />
              </>
            ) : (
              <>
                <input type="hidden" name="gh" value={hanjaOf(r)} />
                <input type="hidden" name="ge" value={eumOf(r)} />
              </>
            )}
            <Button type="submit" size="sm" variant="secondary">
              마이페이지에 저장
            </Button>
          </form>
        ) : (
          <Button asChild size="sm" variant="secondary">
            <Link href={`/login?next=${encodeURIComponent(back)}`}>로그인하고 저장</Link>
          </Button>
        )}
        <Button asChild size="sm" variant="outline">
          <Link href={goodsHref(qs, r)}>리포트 · 맞춤 굿즈</Link>
        </Button>
      </div>
    </>
  );
}

/** 이름 카드 본문 (서버에서 그려 ResultList 에 넘긴다) */
export function NameCardBody({
  group: g,
  p,
  stat: st,
  asOfDate,
  qs,
  loggedIn,
  ent,
  self,
  saved,
}: {
  group: NameGroup;
  p: NamingParams;
  stat: NameStatSummary | undefined;
  asOfDate: string | null;
  qs: string;
  loggedIn: boolean;
  ent: Entitlement;
  /** 셀프 작명 결과 화면이면 저장을 셀프 작명 쪽으로 (qs 에는 from=self 가 들어 있어 리포트 주문도 셀프 조합으로 확인한다) */
  self?: SelfCardMode;
  /** 추천받기 결과 화면: 저장하고 돌아온 한자 조합 (그 조합의 저장 버튼 위에 안내) */
  saved?: SavedNotice & { givenHanja: string };
}) {
  const [best, ...others] = g.options;
  const savedFor = (r: Recommendation) => (saved && saved.givenHanja === hanjaOf(r) ? saved : undefined);
  const a = best.analysis;
  const unlocked = (r: Recommendation) => ent.name(hanjaOf(r), eumOf(r));
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
          <HanjaChars r={best} p={p} unlocked={unlocked(best)} />
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
      {unlocked(best) ? (
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
      ) : (
        <>
          <p className="text-sm">
            <span className="text-muted-foreground">글로벌 발음</span> {best.globalScore}
          </p>
          <LockedPreview
            size="inline"
            what={best.legalAnalysis ? "발음·자원오행 흐름 · 법적 기준 상세" : "발음·자원오행 흐름"}
            href={goodsHref(qs, best)}
          />
        </>
      )}
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
      <LegalDetails r={best} p={p} unlocked={unlocked(best)} />

      <OptionActions r={best} qs={qs} loggedIn={loggedIn} self={self} saved={savedFor(best)} />

      {others.length > 0 && (
        <details className="group rounded-md border" open={others.some((r) => savedFor(r)) || undefined}>
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
                    <HanjaChars r={r} p={p} unlocked={unlocked(r)} />
                  </div>
                  <GradeBadge grade={r.analysis.grade} score={r.analysis.totalScore} size="sm" />
                </div>
                <ScoreBreakdownLine analysis={r.analysis} />
                <LegalDetails r={r} p={p} unlocked={unlocked(r)} />
                <OptionActions r={r} qs={qs} loggedIn={loggedIn} saved={savedFor(r)} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
