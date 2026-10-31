import Link from "next/link";

import { saveName, saveSelfName } from "@/app/naming/actions";
import { NameWithHanja } from "@/components/brand/NameWithHanja";
import { Button } from "@/components/ui/button";
import { NameStatsBasic } from "@/components/name-stats-basic";
import { TierBadge } from "@/components/name-stats-chart";
import { GradeBadge, GyeokGrid, ScoreBreakdownLine } from "@/components/naming/analysis-parts";
import { HeartIcon } from "@/components/naming/heart-icon";
import { LockedPreview } from "@/components/naming/locked-preview";
import { SavedMark, type SavedNotice } from "@/components/naming/saved-status";
import { ShareNameButton } from "@/components/share/share-name-button";
import type { Entitlement } from "@/lib/commerce/entitlement";
import type { NamingParams } from "@/lib/naming/params";
import type { SavedLookup } from "@/lib/naming/saved";
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
      <summary className="cursor-pointer select-none px-3 py-3 text-sm font-medium text-primary">
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
 */
function HanjaChars({ r, unlocked }: { r: Recommendation; unlocked: boolean }) {
  return (
    <div className="space-y-1 text-sm">
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
    </div>
  );
}

/** 이름 뜻 한 줄. 부모 성 함께 쓰기면 새로 고르는 글자만 보고, 문장이 없으면 훈음을 보여 준다 */
function MeaningLine({ r, p }: { r: Recommendation; p: NamingParams }) {
  const chars = r.givenName.slice(p.parentSurname ? [...p.parentSurname.hanja].length : 0);
  const m = nameMeaningOf(chars);
  return <p className="mt-1.5 text-sm text-ink-soft break-keep">{m ? m.sentence : chars.map(hunEum).join(", ")}</p>;
}

/** 카드에 바로 보이는 작은 칩: 흔한 정도(통계가 있을 때만)와 사주·수리 점수 */
function SummaryChips({ r, stat }: { r: Recommendation; stat?: NameStatSummary }) {
  const b = r.analysis.breakdown;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      {stat && <TierBadge tier={stat.tier} />}
      <span className="rounded-full bg-secondary px-2.5 py-1 font-semibold text-ink-soft">
        사주 {b.saju === null ? "-" : Math.round(b.saju)} · 수리 {b.suri === null ? "-" : Math.round(b.suri)}
      </span>
    </div>
  );
}

type ShareCardInput = Parameters<typeof ShareNameButton>[0]["input"];

/** 이름 카드 공유: 법적 이름(부모 성 포함)과 부모 성 글자 수 */
const shareInputOf = (p: NamingParams, r: Recommendation): ShareCardInput => ({
  kind: "hanja",
  surname: p.surname,
  surnameHanja: p.surnameHanja,
  given: eumOf(r),
  givenHanja: hanjaOf(r),
  prefixLength: p.parentSurname ? [...p.parentSurname.hangul].length : 0,
});

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
  savedId,
  reportOrderId,
  share,
}: {
  r: Recommendation;
  qs: string;
  loggedIn: boolean;
  self?: SelfCardMode;
  /** 방금 저장하고 돌아왔을 때 */
  saved?: SavedNotice;
  /** 화면을 열 때 이미 저장한 이름이면 그 저장 id (같은 아이 + 같은 이름) */
  savedId: string | null;
  /** 이미 산 리포트 주문 id (같은 아이 + 같은 이름) */
  reportOrderId: string | null;
  /** 이름 카드 공유에 넘길 이름 (생년월일·사주 없음) */
  share: ShareCardInput;
}) {
  const back = self ? self.resultHref : `/naming/result?${qs}`;
  const savedMarkId = saved?.id ?? savedId;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {loggedIn && savedMarkId ? (
          <SavedMark id={savedMarkId} justSaved={saved} />
        ) : loggedIn ? (
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
            <Button type="submit" size="sm" variant="secondary" aria-label="이 이름을 마이페이지에 저장">
              <HeartIcon />
              저장
            </Button>
          </form>
        ) : (
          <Button asChild size="sm" variant="secondary">
            <Link href={`/login?next=${encodeURIComponent(back)}`}>
              <HeartIcon />
              로그인하고 저장
            </Link>
          </Button>
        )}
        {reportOrderId ? (
          <>
            <Button asChild size="sm">
              <Link href={`/report/${reportOrderId}`}>리포트 보기</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/report/${reportOrderId}?download=1`}>PDF 다운로드</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={goodsHref(qs, r)}>맞춤 굿즈</Link>
            </Button>
          </>
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link href={goodsHref(qs, r)}>리포트 · 맞춤 굿즈</Link>
          </Button>
        )}
        <ShareNameButton input={share} />
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
  savedLookup,
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
  /** 이미 저장한 이름 찾기 (같은 아이 + 같은 이름, lib/naming/saved.ts 의 loadSavedLookup) */
  savedLookup: SavedLookup;
}) {
  const [best, ...others] = g.options;
  const savedFor = (r: Recommendation) => (saved && saved.givenHanja === hanjaOf(r) ? saved : undefined);
  // 저장·리포트 표시 (다른 한자 조합까지 조합마다)
  const marks = (r: Recommendation) => ({
    saved: savedFor(r),
    savedId: savedLookup("hanja", hanjaOf(r), eumOf(r)),
    reportOrderId: ent.reportOrderId(hanjaOf(r), eumOf(r)),
    share: shareInputOf(p, r),
  });
  const a = best.analysis;
  const unlocked = (r: Recommendation) => ent.name(hanjaOf(r), eumOf(r));
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <NameWithHanja name={`${p.surname}${g.hangul}`} hanja={`${p.surnameHanja}${hanjaOf(best)}`} nameSize={28} hanjaSize={15} />
          <MeaningLine r={best} p={p} />
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

      <SummaryChips r={best} stat={st} />

      <OptionActions r={best} qs={qs} loggedIn={loggedIn} self={self} {...marks(best)} />

      {/* 직접 짓기 결과는 이름이 하나뿐이라 처음부터 펼친다 */}
      <details className="rounded-2xl border" open={self ? true : undefined}>
        <summary className="cursor-pointer select-none px-3 py-3 text-sm font-bold text-primary">점수 근거 보기</summary>
        <div className="space-y-3 border-t p-3">
      <HanjaChars r={best} unlocked={unlocked(best)} />
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
            <Link href={`/stats?name=${encodeURIComponent(g.hangul)}`} className="ml-auto inline-flex min-h-11 items-center text-primary underline">
              연도별 상세 통계
            </Link>
          </div>
        </div>
      )}
      <LegalDetails r={best} p={p} unlocked={unlocked(best)} />
        </div>
      </details>

      {others.length > 0 && (
        <details className="group rounded-md border" open={others.some((r) => savedFor(r)) || undefined}>
          <summary className="cursor-pointer select-none px-3 py-3 text-sm font-medium text-primary">
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
                    <MeaningLine r={r} p={p} />
                    <div className="mt-2">
                      <HanjaChars r={r} unlocked={unlocked(r)} />
                    </div>
                  </div>
                  <GradeBadge grade={r.analysis.grade} score={r.analysis.totalScore} size="sm" />
                </div>
                <ScoreBreakdownLine analysis={r.analysis} />
                <LegalDetails r={r} p={p} unlocked={unlocked(r)} />
                <OptionActions r={r} qs={qs} loggedIn={loggedIn} {...marks(r)} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
