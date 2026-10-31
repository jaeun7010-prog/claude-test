import Link from "next/link";
import type { ReactNode } from "react";

import type { Element } from "@/lib/naming/types";
import type { YongsinResult } from "@/lib/saju";

/** 결과 화면 맨 위: 필요한 기운(엔진의 용신·희신)과 오행 다섯 칸. 정확한 비율 막대는 유료라 사주 카드(결제 후)에만 있다 */

export const ELEMENT_STYLE: Record<Element, { hanja: string; word: string; bar: string; bg: string; text: string; and: string; subject: string }> = {
  목: { hanja: "木", word: "나무", bar: "bg-wood-bar", bg: "bg-wood-bg", text: "text-wood-text", and: "와", subject: "가" },
  화: { hanja: "火", word: "불", bar: "bg-fire-bar", bg: "bg-fire-bg", text: "text-fire-text", and: "과", subject: "이" },
  토: { hanja: "土", word: "흙", bar: "bg-earth-bar", bg: "bg-earth-bg", text: "text-earth-text", and: "과", subject: "이" },
  금: { hanja: "金", word: "쇠", bar: "bg-metal-bar", bg: "bg-metal-bg", text: "text-metal-text", and: "와", subject: "가" },
  수: { hanja: "水", word: "물", bar: "bg-water-bar", bg: "bg-water-bg", text: "text-water-text", and: "과", subject: "이" },
};

export const ELEMENTS: Element[] = ["목", "화", "토", "금", "수"];

/** 비율(%, 합·충·형 반영 세력을 유료 막대와 같게 반올림). 엔진은 글자 개수가 아니라 위치 가중치로 세므로 비율로 나눈다 */
export function elementLevel(percent: number): "없음" | "부족" | "보통" | "많음" {
  if (percent === 0) return "없음";
  if (percent < 15) return "부족";
  if (percent < 30) return "보통";
  return "많음";
}

export const elementPercents = (scores: Record<Element, number>): Record<Element, number> => {
  const total = ELEMENTS.reduce((sum, e) => sum + scores[e], 0);
  return Object.fromEntries(ELEMENTS.map((e) => [e, total > 0 ? Math.round((scores[e] / total) * 100) : 0])) as Record<Element, number>;
};

function Need({ element, particle }: { element: Element; particle: "and" | "subject" }) {
  const s = ELEMENT_STYLE[element];
  return (
    <>
      <span className={s.text}>
        {s.word}(<span className="font-serif">{s.hanja}</span>)
      </span>
      {s[particle]}
    </>
  );
}

export function ElementNeed({
  yongsin,
  meta,
  action,
  heading: Heading = "h1",
}: {
  yongsin: Pick<YongsinResult, "yongsin" | "huisin" | "scores">;
  /** 맨 위 한 줄 (성·생년월일·출생지) */
  meta: string;
  /** 오른쪽 위 "다시 입력" 같은 링크 */
  action?: ReactNode;
  /** 화면에 다른 제목이 있으면 h2 */
  heading?: "h1" | "h2";
}) {
  const percents = elementPercents(yongsin.scores);
  return (
    <section aria-labelledby="element-need" className="space-y-4 rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 pt-3 text-xs text-muted-foreground break-keep">{meta}</p>
        {action}
      </div>
      <Heading id="element-need" className="text-2xl font-extrabold leading-snug break-keep sm:text-3xl">
        이 아이에게는 <Need element={yongsin.yongsin} particle="and" /> <Need element={yongsin.huisin} particle="subject" /> 필요해요
      </Heading>
      <ul aria-label="사주의 오행" className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {ELEMENTS.map((e) => {
          const s = ELEMENT_STYLE[e];
          return (
            <li key={e} className={`flex flex-col items-center gap-0.5 rounded-2xl px-1 py-3 ${s.bg} ${s.text}`}>
              <span className="font-serif text-xl font-bold leading-tight">{s.hanja}</span>
              <span className="text-xs">{e}</span>
              <span className="mt-1 text-sm font-bold">{elementLevel(percents[e])}</span>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground break-keep">
        다섯 칸은 사주에 든 기운의 양이에요. 필요한 기운은 양만이 아니라 강약·계절·격국까지 보고 정해요.
      </p>
      <Link href="#saju" className="inline-flex min-h-11 items-center text-sm font-bold text-primary underline-offset-4 hover:underline">
        왜 {ELEMENT_STYLE[yongsin.yongsin].word}
        {ELEMENT_STYLE[yongsin.yongsin].and} {ELEMENT_STYLE[yongsin.huisin].word}인가요?
      </Link>
    </section>
  );
}
