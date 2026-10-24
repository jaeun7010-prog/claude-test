"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { GradeBadge, GradeChip } from "@/components/naming/grade-badge";
import { unpackSelfTable, type PackedSelfTable } from "@/lib/naming/self-pack";
import {
  isBadgeEligible,
  rankSlot,
  scoreOfPicks,
  selfNotice,
  topCombos,
  type SelfBadge,
  type SelfChar,
  type SelfPicks,
  type SelfScore,
  type SelfTable,
} from "@/lib/naming/self-rank";

/**
 * 셀프 작명 고르기 화면 (브라우저). 서버가 보낸 무료 점수표만 보고 정렬·[최고]/[추천]·안내를 계산한다 (self-rank.ts).
 * 고른 한자는 주소의 `hj`(자리마다 한자, 안 고른 자리는 _)에 남겨 새로 고침·공유해도 그대로 열린다.
 */

const SLOT_LABEL = ["첫째 글자", "둘째 글자"];
const GYEOK_LABEL = ["원격", "형격", "이격", "정격"];
const SUITABILITY_LABEL: Partial<Record<SelfChar["suitability"], string>> = {
  obscure: "뜻 약함",
  awkward: "뜻 어색",
};

/** 받침 있으면 a, 없으면 b (예: 은/는, 과/와) */
const josa = (word: string, a: string, b: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? a : b;
};
const hunEum = (c: SelfChar) => (c.hun ? `${c.hun} ${c.eum}` : c.eum);
const fmt = (n: number) => n.toFixed(1);

function Badge({ badge }: { badge: SelfBadge }) {
  if (!badge) return null;
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
        badge === "최고" ? "bg-primary text-primary-foreground" : "border border-primary text-primary"
      }`}
    >
      {badge}
    </span>
  );
}

/** 4격 한 칸: 길한 수만 격 이름 (이름표는 서버에서 받는다. 풀이 문장은 유료라 브라우저로 보내지 않는다) */
function gyeokText(g: { suri: number; lucky: boolean }, names: Record<number, string>) {
  const name = g.lucky ? names[g.suri] : undefined;
  return `${g.suri}수${name ? ` ${name}` : ""} · ${g.lucky ? "길" : "흉"}`;
}

/** 고른 조합의 점수 (무료 숫자만) */
function PickedScore({
  t,
  score,
  suriNames,
  legalName,
}: {
  t: SelfTable;
  score: SelfScore;
  suriNames: Record<number, string>;
  legalName: string | null;
}) {
  const b = score.breakdown;
  const items: [string, number | null][] = [
    ["사주 보완", b.saju],
    ["수리", b.suri],
    ["자원오행", b.resource],
  ];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {items.map(([label, v]) => (
          <span key={label}>
            <span className="text-muted-foreground">{label}</span> {v === null ? "-" : Math.round(v)}
          </span>
        ))}
        <span>
          <span className="text-muted-foreground">발음오행</span> {Math.round(t.pronunciation.score)}
          <span className="text-xs text-muted-foreground"> (소리로 정해짐)</span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
        {score.gyeok.map((g, i) => (
          <p key={GYEOK_LABEL[i]}>
            <span className="text-muted-foreground">{GYEOK_LABEL[i]}</span> {gyeokText(g, suriNames)}
          </p>
        ))}
      </div>
      {score.legal && legalName && (
        <p className="text-xs text-muted-foreground">
          법적 이름 전체 기준 (참고, {legalName}): {score.legal.grade}등급 {fmt(score.legal.totalScore)}점
        </p>
      )}
    </div>
  );
}

export function SelfPicker({
  packed,
  initialPicks,
  surnameHangul,
  surnameHanja,
  prefix,
  suriNames,
  recommendHref,
  dolrimjaHref,
}: {
  packed: PackedSelfTable;
  initialPicks: SelfPicks;
  surnameHangul: string;
  surnameHanja: string;
  /** 부모 성 함께 쓰기 (새로 고르는 부분 앞에 붙는 글자) */
  prefix: { hangul: string; hanja: string } | null;
  /** 길한 수의 격 이름 (예: 33 → 승천격) */
  suriNames: Record<number, string>;
  /** 같은 사주로 추천받기 (이 사주에 맞는 다른 소리 보기) */
  recommendHref: string;
  /** 첫 글자를 돌림자로 두고 둘째 글자 추천받기 (두 글자 이름만) */
  dolrimjaHref: string | null;
}) {
  const t = useMemo(() => unpackSelfTable(packed), [packed]);
  const [picks, setPicks] = useState<SelfPicks>(initialPicks);
  const [showWeak, setShowWeak] = useState<boolean[]>(() => t.slots.map(() => false));

  const notice = useMemo(() => selfNotice(t), [t]);
  const top = useMemo(() => topCombos(t), [t]);
  const ranked = useMemo(() => t.slots.map((_, i) => rankSlot(t, i, picks)), [t, picks]);
  const picked = scoreOfPicks(t, picks);

  const two = t.slots.length === 2;
  const eumText = t.slots.map((s) => s.eum).join("");
  const charAt = (slot: number, i: number | null) => (i === null ? null : t.slots[slot].chars[i]);

  const update = (next: SelfPicks) => {
    setPicks(next);
    try {
      const url = new URL(window.location.href);
      const hj = next.map((i, s) => charAt(s, i)?.hanja ?? "_").join("");
      if (next.every((i) => i === null)) url.searchParams.delete("hj");
      else url.searchParams.set("hj", hj);
      window.history.replaceState(window.history.state, "", url);
    } catch {
      // 주소를 바꿀 수 없어도 고르기는 그대로 된다
    }
  };
  const toggle = (slot: number, index: number) =>
    update(picks.map((p, s) => (s === slot ? (p === index ? null : index) : p)));

  const legalName = prefix
    ? `${surnameHangul} ${prefix.hangul}${eumText}(${prefix.hanja}${picks.map((i, s) => charAt(s, i)?.hanja ?? "○").join("")})`
    : null;

  return (
    <div className="space-y-6">
      {/* 고른 이름: 아래 글자 목록으로 내려가도 보이게 위에 붙인다 (휴대폰 화면을 덜 가리도록 한 줄로) */}
      <div className="sticky top-14 z-10 flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-sm">
        <div className="min-w-0 flex-1">
          <p className="font-serif text-2xl font-bold leading-tight break-keep">
            {surnameHanja}
            {prefix?.hanja}
            {t.slots.map((_, s) => (
              <span key={s} className={picks[s] === null ? "text-muted-foreground/50" : ""}>
                {charAt(s, picks[s])?.hanja ?? "○"}
              </span>
            ))}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {surnameHangul}
            {prefix?.hangul}
            {eumText}
            {picks.some((p) => p !== null) &&
              ` · ${t.slots
                .map((_, s) => {
                  const c = charAt(s, picks[s]);
                  return c ? hunEum(c) : "?";
                })
                .join(", ")}`}
          </p>
        </div>
        {picked ? (
          <GradeBadge grade={picked.grade} score={picked.totalScore} size="sm" />
        ) : (
          <p className="w-28 shrink-0 text-right text-xs text-muted-foreground break-keep">
            {two ? "두 글자를 모두 고르면 점수가 나와요" : "글자를 고르면 점수가 나와요"}
          </p>
        )}
      </div>

      {picked && (
        <section className="space-y-2 rounded-lg border p-4">
          <h2 className="text-sm font-medium">
            고른 조합 성명학 점수 {picked.grade}등급 {fmt(picked.totalScore)}점
          </h2>
          <PickedScore t={t} score={picked} suriNames={suriNames} legalName={legalName} />
        </section>
      )}

      {notice && (
        <div
          role="status"
          className={`space-y-2 rounded-md p-4 text-sm ${notice.tone === "good" ? "bg-secondary" : "border"}`}
        >
          <p className="break-keep">{notice.text}</p>
          {notice.tone !== "good" && (
            <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-4">
              <Link href={recommendHref} className="text-primary underline underline-offset-2">
                이 사주에 맞는 다른 소리 보기
              </Link>
              {notice.suggestDolrimja && dolrimjaHref && (
                <Link href={dolrimjaHref} className="text-primary underline underline-offset-2">
                  &lsquo;{t.slots[0].eum}&rsquo;{josa(t.slots[0].eum, "은", "는")} 두고 둘째 글자 추천받기
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      <div className="rounded-md border p-4 text-sm">
        <p className="font-medium">
          소리로 정해지는 참고 항목: 발음오행 {Math.round(t.pronunciation.score)}점
        </p>
        <p className="mt-1 text-xs text-muted-foreground break-keep">
          발음오행은 이름 소리({t.slots.map((s) => s.eum).join("·")})의 첫소리로 정해져 어떤 한자를 골라도 같아요.
          한자를 바꿔 달라지는 것은 사주 보완·수리·자원오행이에요.
        </p>
      </div>

      {top.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-serif text-lg font-bold">추천 조합</h2>
          <ul className="grid gap-2 sm:grid-cols-3">
            {top.map((c) => {
              const chars = c.picks.map((i, s) => t.slots[s].chars[i]);
              const on = c.picks.every((i, s) => picks[s] === i);
              return (
                <li key={chars.map((ch) => ch.hanja).join("")}>
                  <button
                    type="button"
                    onClick={() => update(c.picks)}
                    aria-pressed={on}
                    className={`flex w-full items-center justify-between gap-3 rounded-md border-2 p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      on ? "border-primary bg-secondary" : "border-input hover:bg-secondary/50"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block font-serif text-xl font-bold">{chars.map((ch) => ch.hanja).join("")}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {chars.map(hunEum).join(", ")}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-sm">
                      <GradeChip grade={c.score.grade} />
                      {fmt(c.score.totalScore)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {t.slots.map((slot, s) => {
        const list = ranked[s];
        const strong = list.filter((r) => isBadgeEligible(r.char));
        const weak = list.filter((r) => !isBadgeEligible(r.char));
        const other = two ? charAt(1 - s, picks[1 - s]) : null;
        const visible = showWeak[s] ? [...strong, ...weak] : strong;
        return (
          <section key={s} className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <h2 className="font-serif text-lg font-bold">
                {two ? `${SLOT_LABEL[s]} ` : ""}&lsquo;{slot.eum}&rsquo; 한자
              </h2>
              <span className="text-xs text-muted-foreground">{slot.chars.length}자</span>
            </div>
            <p className="text-xs text-muted-foreground break-keep">
              {!two
                ? "점수는 이 글자 하나로 지은 이름의 성명학 점수예요."
                : other
                  ? `점수는 고른 ${SLOT_LABEL[1 - s]} ${other.hanja}(${hunEum(other)})${josa(other.eum, "과", "와")} 함께 쓴 점수예요.`
                  : `점수는 이 글자로 만들 수 있는 가장 높은 조합 점수예요. ${SLOT_LABEL[1 - s]}를 고르면 그 글자와 함께 쓴 점수로 바뀌어요.`}
              {(slot.hiddenMeaning > 0 || slot.hiddenGender > 0) &&
                ` 뜻이 이름에 맞지 않는 한자${slot.hiddenMeaning ? ` ${slot.hiddenMeaning}자` : ""}${
                  slot.hiddenGender ? `${slot.hiddenMeaning ? "와" : ""} 아이 성별에 맞지 않는 한자 ${slot.hiddenGender}자` : ""
                }는 뺐어요.`}
            </p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {visible.map((r) => {
                const on = picks[s] === r.index;
                const weakLabel = SUITABILITY_LABEL[r.char.suitability];
                return (
                  <li key={r.char.hanja}>
                    <button
                      type="button"
                      onClick={() => toggle(s, r.index)}
                      aria-pressed={on}
                      disabled={!r.score}
                      className={`flex h-full w-full items-start gap-2 rounded-md border-2 p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 ${
                        on ? "border-primary bg-secondary" : "border-input hover:bg-secondary/50"
                      }`}
                    >
                      <span className="font-serif text-2xl font-bold leading-none">{r.char.hanja}</span>
                      <span className="min-w-0 flex-1 space-y-1">
                        <span className="block truncate text-xs">{hunEum(r.char)}</span>
                        <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                          {r.score ? (
                            <>
                              <GradeChip grade={r.score.grade} />
                              {fmt(r.score.totalScore)}
                            </>
                          ) : (
                            "같은 한자"
                          )}
                          <Badge badge={r.badge} />
                          {weakLabel && <span className="rounded bg-secondary px-1 text-[11px]">{weakLabel}</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {weak.length > 0 && (
              <button
                type="button"
                onClick={() => setShowWeak(showWeak.map((v, i) => (i === s ? !v : v)))}
                className="text-sm text-primary underline underline-offset-2"
              >
                {showWeak[s] ? "뜻이 약한 한자 접기" : `뜻이 약하거나 어색한 한자 ${weak.length}자 더 보기`}
              </button>
            )}
          </section>
        );
      })}

      <div className="space-y-1 text-xs text-muted-foreground break-keep">
        <p>
          [최고]는 이 자리에서 점수가 가장 높은 한자, [추천]은 그다음 A등급 이상 한자예요(최대 5개). 뜻이 약하거나
          어색한 한자는 고를 수 있지만 [최고]·[추천]과 추천 조합에서는 뺐어요.
        </p>
        <p>
          <Link href={recommendHref} className="text-primary underline underline-offset-2">
            이 사주에 맞는 다른 소리 보기
          </Link>
        </p>
      </div>
    </div>
  );
}
