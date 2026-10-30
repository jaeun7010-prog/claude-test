import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Logo, LogoMark, LogoStacked } from "@/components/brand/LogoMark";
import { NameCardFrame } from "@/components/brand/NameCardFrame";
import { NameWithHanja } from "@/components/brand/NameWithHanja";
import { PebbleFrame } from "@/components/brand/PebbleFrame";
import { GradeBadge } from "@/components/naming/grade-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = { title: "디자인 기초 확인", robots: { index: false, follow: false } };

const ELEMENTS = [
  { hanja: "木", name: "목", bar: "bg-wood-bar", bg: "bg-wood-bg", text: "text-wood-text" },
  { hanja: "火", name: "화", bar: "bg-fire-bar", bg: "bg-fire-bg", text: "text-fire-text" },
  { hanja: "土", name: "토", bar: "bg-earth-bar", bg: "bg-earth-bg", text: "text-earth-text" },
  { hanja: "金", name: "금", bar: "bg-metal-bar", bg: "bg-metal-bg", text: "text-metal-text" },
  { hanja: "水", name: "수", bar: "bg-water-bar", bg: "bg-water-bg", text: "text-water-text" },
];

const COLORS = [
  ["바다", "bg-sea"],
  ["진한 바다", "bg-sea-deep"],
  ["먹", "bg-ink"],
  ["모래", "bg-sand"],
  ["연모래", "bg-sand-light"],
  ["하늘", "bg-sky"],
  ["조약돌 하늘", "bg-sky-pebble"],
  ["연하늘", "bg-sky-light"],
  ["코랄", "bg-coral"],
];

/** 개발 중에 디자인 기초를 한눈에 보는 화면. 배포 환경에서는 없는 주소다 */
export default function DesignCheckPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto max-w-3xl space-y-12 px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">디자인 기초 확인</h1>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">색</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {COLORS.map(([label, bg]) => (
            <div key={label} className="space-y-1">
              <div className={`h-16 rounded-2xl ${bg}`} />
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {ELEMENTS.map((e) => (
            <div key={e.hanja} className={`space-y-2 rounded-2xl p-4 ${e.bg} ${e.text}`}>
              <p className="font-serif text-2xl font-bold">
                {e.hanja} {e.name}
              </p>
              <div className={`h-2.5 rounded-full ${e.bar}`} />
            </div>
          ))}
        </div>
        <div className="flex h-3 overflow-hidden rounded-full">
          <div className="w-[35%] bg-score-1" />
          <div className="w-[30%] bg-score-2" />
          <div className="w-[20%] bg-score-3" />
          <div className="w-[15%] bg-score-4" />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-extrabold">글자</h2>
        <p className="text-3xl font-extrabold tracking-tight">제목 30 · 굵게</p>
        <p className="text-[17px]">본문 17 · 결론 먼저, 한 문장에 한 가지</p>
        <p className="text-base">본문 16</p>
        <p className="text-sm text-ink-soft">보조 14</p>
        <p className="text-xs text-muted-foreground">가장 작은 글자 13</p>
        <p className="text-sm font-bold text-coral-text">무료</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">버튼·입력·등급</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg">무료로 이름 받기</Button>
          <Button variant="outline">보조 버튼</Button>
          <Button size="sm" variant="secondary">
            작은 버튼
          </Button>
        </div>
        <Input placeholder="입력 칸" className="max-w-xs" />
        <div className="flex flex-wrap items-center gap-3">
          <GradeBadge grade="S" score={94.3} />
          <GradeBadge grade="A" score={88.1} />
          <GradeBadge grade="B" score={82.4} />
          <GradeBadge grade="C" score={76.2} />
          <GradeBadge grade="S" score={94.3} size="sm" />
          <GradeBadge grade="C" score={76.2} size="sm" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-extrabold">로고</h2>
        <div className="flex flex-wrap items-center gap-8">
          <Logo />
          <LogoStacked width={160} />
          <LogoMark width={80} color="hsl(var(--sea))" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-extrabold">이름 표시</h2>
        <div className="flex flex-wrap items-start gap-8">
          <NameWithHanja name="김서윤" hanja="金瑞潤" />
          <NameWithHanja name="남궁하윤" hanja="南宮河潤" nameSize={28} hanjaSize={14} />
          <NameWithHanja name="김하늘빛" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-extrabold">장식 틀</h2>
        <PebbleFrame className="max-w-[480px]">
          <div className="flex items-start justify-between gap-3">
            <NameWithHanja name="김서윤" hanja="金瑞潤" />
            <GradeBadge grade="S" score={94} />
          </div>
        </PebbleFrame>
        <div className="grid gap-4 sm:grid-cols-2">
          <NameCardFrame tone="sand">
            <NameWithHanja name="김서윤" hanja="金瑞潤" nameSize={32} hanjaSize={16} />
          </NameCardFrame>
          <NameCardFrame tone="sky">
            <NameWithHanja name="김하늘빛" nameSize={32} />
          </NameCardFrame>
        </div>
      </section>
    </main>
  );
}
