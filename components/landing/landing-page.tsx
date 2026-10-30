import Link from "next/link";
import type { ReactNode } from "react";

import { NameCardFrame } from "@/components/brand/NameCardFrame";
import { NameWithHanja } from "@/components/brand/NameWithHanja";
import { PebbleFrame } from "@/components/brand/PebbleFrame";
import { DataSourceNote } from "@/components/data-source-note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { REPORT_PRICE } from "@/lib/commerce/catalog";
import { GRADE_MIN, SCORE_WEIGHTS } from "@/lib/naming/score";
import { SELF_MAX_LENGTH } from "@/lib/naming/self-rank";
import { formatAsOfDate } from "@/lib/name-stats/snapshot";
import type { Tier, YearPoint } from "@/lib/stats/name-stats";
import { cn } from "@/lib/utils";

/** 첫 화면 통계 예시 이름 ("서윤")의 실제 통계. 실제 자료가 없으면 null이고 화면에는 "통계 준비 중"만 나온다 */
export interface LandingStats {
  name: string;
  asOfDate: string;
  /** 목록에 오른 최근 연도들 (오래된 해 먼저) */
  points: YearPoint[];
  latest: YearPoint;
  tier: Tier | null;
}

const SECTION_TITLE = "text-[clamp(26px,3.4vw,38px)] font-extrabold leading-[1.3] tracking-tight";
const SECTION_LEAD = "text-[17px] text-ink-soft";
const CHIP = "rounded-full border border-input bg-cream px-3 py-1 text-sm font-semibold";

function Icon({ children, size = 22, className }: { children: ReactNode; size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

/** 문장 속 한자만 명조로 (제목·본문은 고딕, 이름과 한자만 명조) */
function HanjaText({ text }: { text: string }) {
  return (
    <>
      {text.split(/([一-鿿]+)/).map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="font-serif">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

const CheckIcon = () => (
  <Icon size={18} className="mt-1 flex-none text-sea">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);

/** 주 버튼. 시안의 큰 버튼(글자 18px, 화살표) */
function StartButton({ className }: { className?: string }) {
  return (
    <Button asChild size="lg" className={cn("h-14 px-7 text-lg font-extrabold [&_svg]:size-5", className)}>
      <Link href="/naming">
        무료로 이름 받기
        <Icon>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </Icon>
      </Link>
    </Button>
  );
}

const SAMPLE_SCORES = [
  { label: "사주 보완", value: 34, max: SCORE_WEIGHTS.saju },
  { label: "수리", value: 29, max: SCORE_WEIGHTS.suri },
  { label: "발음 오행", value: 16, max: SCORE_WEIGHTS.pronunciation },
  { label: "자원 오행", value: 13, max: SCORE_WEIGHTS.resource },
];

function SampleResultCard({ stats }: { stats: LandingStats | null }) {
  return (
    <PebbleFrame className="max-w-[480px] px-3 sm:px-6" cardClassName="flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-sand-text">예시 결과 · 1위</p>
          <NameWithHanja name="김서윤" hanja="金瑞潤" />
        </div>
        <div className="flex size-16 flex-none flex-col items-center justify-center rounded-[20px] bg-sea text-white">
          <span className="text-[22px] font-extrabold leading-none">S</span>
          <span className="text-xs font-bold">92점</span>
        </div>
      </div>
      <dl className="flex flex-col gap-2 text-xs">
        {SAMPLE_SCORES.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5">
            <dt className="w-[68px] flex-none font-medium text-ink-soft">{s.label}</dt>
            <dd className="contents">
              <span className="h-2 flex-1 rounded-full bg-line">
                <span className="block h-2 rounded-full bg-sea" style={{ width: `${(s.value / s.max) * 100}%` }} />
              </span>
              <span className="w-11 flex-none text-right font-bold">
                {s.value}/{s.max}
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex items-center justify-between gap-2.5 rounded-2xl bg-cream px-3.5 py-3">
        {stats ? (
          <div className="min-w-0">
            <p className="text-xs font-bold text-ink-faint">출생신고 통계 · {formatAsOfDate(stats.asOfDate)} 기준</p>
            <p className="text-sm font-bold">같은 이름 여자아이 {stats.latest.female.toLocaleString("ko-KR")}명</p>
          </div>
        ) : (
          <p className="text-sm font-bold">출생 통계 준비 중</p>
        )}
        {stats?.tier === "흔함" && (
          <span className="flex-none rounded-full bg-sand-light px-2.5 py-1 text-xs font-bold text-sand-text">
            많이 쓰는 이름
          </span>
        )}
      </div>
      <p className="border-t border-dashed border-input pt-2.5 text-xs text-ink-faint">
        근거: 성명학 4대 요소 · 인명용 한자 자료(Unihan){stats && " · 대법원 출생신고 통계"}
      </p>
    </PebbleFrame>
  );
}

function Hero({ stats }: { stats: LandingStats | null }) {
  return (
    <section
      aria-labelledby="hero-title"
      className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-12 px-4 pb-10 pt-10 sm:px-6 sm:pt-14"
    >
      <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
        <span className="self-start rounded-full bg-sand-light px-3.5 py-1.5 text-sm font-bold text-sand-text">
          {stats ? "사주 작명에 출생 통계까지 · 추천 이름 무료" : "사주 작명 · 추천 이름 무료"}
        </span>
        <h1 id="hero-title" className="text-[clamp(28px,3.4vw,44px)] font-extrabold leading-[1.25] tracking-tight">
          우리 아이 사주에 맞는 이름,
          <br />
          <span className="text-sea">근거까지</span> 보여 드려요
        </h1>
        <p className="max-w-[30em] text-lg text-ink-soft">
          {stats
            ? "성씨와 태어난 날만 넣으면 추천 이름 30개를 점수, 출처, 출생 통계와 함께 무료로 받아요."
            : "성씨와 태어난 날만 넣으면 추천 이름 30개를 점수와 출처까지 무료로 받아요."}
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <StartButton />
          <Link
            href="/naming/self"
            className="inline-flex min-h-11 items-center font-bold text-sea underline underline-offset-4 hover:text-sea-deep"
          >
            생각해 둔 이름 점수 보기
          </Link>
        </div>
        <p className="text-sm text-ink-faint">카드 등록 없이 바로 시작해요</p>
      </div>
      <div className="flex min-w-0 flex-[1_1_400px] justify-center">
        <SampleResultCard stats={stats} />
      </div>
    </section>
  );
}

const PROMISES = [
  {
    title: "같은 정보면 늘 같은 결과",
    text: "기준이 하나라 흔들리지 않아요",
    tone: "bg-sky-light text-sea",
    icon: <path d="M4 7h16M4 12h16M4 17h10" />,
  },
  {
    title: "점수마다 출처 공개",
    // 시안은 "논문과 공공 자료로 계산해요". 논문은 참고로만 적기로 해서 바꿨다
    text: "공공 자료로 계산하고 논문을 참고해요",
    tone: "bg-sand-light text-sand-text",
    icon: (
      <>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M9 12h7M9 16h5" />
      </>
    ),
  },
  {
    title: "출생 통계까지 함께",
    text: "몇 명이 쓰는 이름인지 보여요",
    noStats: { title: "출생 통계 (준비 중)", text: "자료를 받으면 몇 명이 쓰는 이름인지 보여 드려요" },
    tone: "bg-sky-light text-sea",
    icon: <path d="M5 20V10M12 20V4M19 20v-7" />,
  },
  {
    title: "추천 이름 30개 무료",
    text: "마음에 드는 이름만 깊이 보세요",
    tone: "bg-sand-light text-sand-text",
    icon: <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />,
  },
];

function Promises({ hasStats }: { hasStats: boolean }) {
  return (
    <section aria-label="이름핏의 약속" className="mx-auto max-w-[1120px] px-4 pb-16 pt-2 sm:px-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PROMISES.map((p) => {
          const words = !hasStats && p.noStats ? p.noStats : p;
          return (
            <div key={p.title} className="flex items-center gap-3.5 rounded-3xl border bg-card px-5 py-4">
              <span className={cn("flex size-11 flex-none items-center justify-center rounded-[14px]", p.tone)}>
                <Icon>{p.icon}</Icon>
              </span>
              <div>
                <p className="font-extrabold">{words.title}</p>
                <p className="text-sm text-ink-faint">{words.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const WHY_ITEMS = [
  { label: "기준", before: "작명가마다 보는 기준이 달라요", after: "공개된 한 가지 기준으로 계산해요" },
  { label: "근거", before: "결과만 받고, 이유는 듣기 어려워요", after: "항목별 점수와 참고 자료를 함께 보여 드려요" },
  { label: "계산", before: "획수와 오행을 사람이 손으로 세요", after: "인명용 한자 자료로 자동 계산해요" },
  {
    label: "통계",
    before: "이름이 얼마나 흔한지 알기 어려워요",
    after: "출생신고 통계로 몇 명이 쓰는지 보여 드려요",
    afterNoStats: "출생신고 통계를 준비하고 있어요",
  },
  { label: "비용", before: "후보 이름을 받을 때마다 비용이 들어요", after: "추천 이름 30개와 점수는 무료예요" },
];

function Why({ hasStats }: { hasStats: boolean }) {
  return (
    <section id="why" aria-labelledby="why-title" className="scroll-mt-16 border-y bg-card">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-8 px-4 py-16 sm:px-6 sm:py-[72px]">
        <div className="flex max-w-[640px] flex-col gap-2.5">
          <h2 id="why-title" className={SECTION_TITLE}>
            같은 아이인데, 작명가마다 이름이 다른 이유
          </h2>
          <p className={SECTION_LEAD}>
            작명에는 하나로 정해진 기준이 없어요. 그래서 이름핏은 어떤 기준으로 계산하는지 먼저 공개해요.
          </p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
          {WHY_ITEMS.map((w) => (
            <div key={w.label} className="flex flex-col gap-3.5 rounded-3xl border bg-cream p-5">
              <span className="text-sm font-extrabold text-sand-text">{w.label}</span>
              <p className="text-[15px] text-ink-faint">{w.before}</p>
              <p className="flex items-start gap-2 font-bold">
                <CheckIcon />
                {(!hasStats && w.afterNoStats) || w.after}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsChart({ stats }: { stats: LandingStats }) {
  const max = Math.max(1, ...stats.points.flatMap((p) => [p.female, p.male]));
  const recent = stats.points.slice(-2).reverse();
  const count = (n: number) => n.toLocaleString("ko-KR");
  return (
    <>
      <p className="text-sm text-ink-faint">연도별 출생신고 건수</p>
      <div
        role="img"
        aria-label={`${stats.name} 연도별 출생신고 건수 막대그래프`}
        className="flex h-40 items-end gap-3.5 border-b pb-1"
      >
        {stats.points.map((p) => (
          <div key={p.year} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-[130px] w-full items-end gap-[3px]">
              <span className="block flex-1 rounded-t-md bg-sand" style={{ height: `${(p.female / max) * 100}%` }} />
              <span className="block flex-1 rounded-t-md bg-sky" style={{ height: `${(p.male / max) * 100}%` }} />
            </div>
            <span className="text-xs text-ink-faint">{p.year}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-xs text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="block size-3 rounded-[3px] bg-sand" />
          여자아이
        </span>
        <span className="flex items-center gap-1.5">
          <span className="block size-3 rounded-[3px] bg-sky" />
          남자아이
        </span>
      </div>
      <div className="flex flex-col gap-1.5 text-[15px]">
        {recent.map((p) => (
          <div key={p.year} className="flex justify-between rounded-xl bg-cream px-3.5 py-2.5">
            <b>{p.year}</b>
            <span>
              여 {count(p.female)} · 남 {count(p.male)}
            </span>
          </div>
        ))}
      </div>
      <DataSourceNote />
    </>
  );
}

function Stats({ stats }: { stats: LandingStats | null }) {
  return (
    <section
      id="stats"
      aria-labelledby="stats-title"
      className="mx-auto flex max-w-[1120px] scroll-mt-16 flex-wrap items-center gap-10 px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-4">
        <span className="self-start rounded-full bg-sky-light px-3.5 py-1.5 text-sm font-bold text-sea-deep">
          {stats ? "사주에 통계까지" : "통계 준비 중"}
        </span>
        <h2 id="stats-title" className={SECTION_TITLE}>
          이 이름, 몇 명이나 쓸까요?
        </h2>
        <p className={SECTION_LEAD}>
          {stats
            ? "사주 작명과 함께 출생신고 통계를 보여 드려요. 너무 흔한 이름이 걱정될 때 바로 확인하세요."
            : "출생신고 통계를 준비하고 있어요. 자료를 받으면 이런 내용을 보여 드려요."}
        </p>
        <ul className="flex flex-col gap-2.5 font-medium">
          {[
            "연도별 여자아이·남자아이 출생신고 건수",
            "요즘 늘어나는 이름, 줄어드는 이름",
            "기준일과 출처를 숫자 옆에 표시",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2.5">
              <CheckIcon />
              {t}
            </li>
          ))}
        </ul>
        {stats && (
          <Button asChild variant="outline" className="self-start border-sea font-extrabold text-sea">
            <Link href="/stats">이름 통계 보기</Link>
          </Button>
        )}
      </div>
      <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-7">
        <NameWithHanja name="서윤" nameSize={30} />
        {stats ? (
          <StatsChart stats={stats} />
        ) : (
          <div className="rounded-2xl bg-cream px-4 py-10 text-center">
            <p className="font-bold">통계 준비 중</p>
            <p className="mt-1 text-sm text-ink-faint">대법원 출생신고 자료를 받으면 연도별 건수를 보여 드려요.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function Free({ hasStats }: { hasStats: boolean }) {
  const items = [
    "사주에 필요한 오행 분석",
    "추천 이름 최대 30개와 등급",
    hasStats ? "출생신고 이름 통계" : "출생신고 이름 통계 (준비 중)",
    "순우리말 이름 전부",
    "생각해 둔 이름 점수 확인",
    "이름 카드 (돌·백일 카드는 준비 중)",
  ];
  return (
    <section id="free" aria-labelledby="free-title" className="scroll-mt-16 border-y bg-card">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-8 px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex max-w-[640px] flex-col gap-2.5">
          <h2 id="free-title" className={SECTION_TITLE}>
            여기까지는 무료예요
          </h2>
          <p className={SECTION_LEAD}>
            이름을 고르는 데 필요한 건 모두 무료로 드려요. 고른 이름을 깊이 보고 싶을 때만 리포트를 받으세요.
          </p>
        </div>
        <div className="flex flex-wrap items-stretch gap-4">
          <div className="flex min-w-0 flex-[3_1_420px] flex-col gap-5 rounded-3xl border-2 border-sea bg-cream p-6 sm:p-8">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-[56px] font-extrabold leading-none text-sea">0원</span>
              <span className="font-bold text-ink-soft">카드 등록 없이</span>
            </div>
            <ul className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-5 gap-y-3 font-medium">
              {items.map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <CheckIcon />
                  {t}
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="self-start font-extrabold">
              <Link href="/naming">무료로 이름 받기</Link>
            </Button>
          </div>
          <div className="flex min-w-0 flex-[2_1_300px] flex-col gap-4 rounded-3xl bg-sand-light p-6 sm:p-8">
            <div>
              <p className="text-[15px] font-bold text-sand-text">고른 이름을 깊이 볼 때만</p>
              <p className="text-2xl font-extrabold">상세 리포트 PDF</p>
              <p className="text-[28px] font-extrabold text-ink-soft">{REPORT_PRICE.toLocaleString("ko-KR")}원</p>
            </div>
            <ul className="flex flex-col gap-2 text-[15px] text-ink-soft">
              <li>· 81수 4격 풀이 전체</li>
              <li>· 한자 하나하나의 뜻과 오행</li>
              <li>· 사주를 어떻게 채우는지 설명</li>
              <li>· 결제한 내용은 바뀌지 않게 보관</li>
            </ul>
            {/* TODO: 조건 없이 볼 수 있는 리포트 미리 보기 화면이 생기면 링크로 바꾼다 */}
            <p className="text-sm font-bold text-sand-text">리포트 미리 보기는 준비 중이에요</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// 오행 색은 오행을 뜻할 때만 쓴다
const ELEMENT_CELLS = [
  { hanja: "木", name: "목 · 나무", text: "어짊(仁) · 자라나는 힘", box: "bg-wood-bg text-wood-text", bar: "bg-wood-bar" },
  { hanja: "火", name: "화 · 불", text: "예의(禮) · 밝고 따뜻함", box: "bg-fire-bg text-fire-text", bar: "bg-fire-bar" },
  { hanja: "土", name: "토 · 흙", text: "믿음(信) · 든든한 중심", box: "bg-earth-bg text-earth-text", bar: "bg-earth-bar" },
  { hanja: "金", name: "금 · 쇠", text: "의로움(義) · 단단하고 맑음", box: "bg-metal-bg text-metal-text", bar: "bg-metal-bar" },
  { hanja: "水", name: "수 · 물", text: "지혜(智) · 깊고 유연함", box: "bg-water-bg text-water-text", bar: "bg-water-bar" },
];

function ConditionCard({
  icon,
  title,
  text,
  children,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border bg-card p-6">
      <span className="flex size-11 items-center justify-center rounded-[14px] bg-sand-tint text-sand-text">
        <Icon>{icon}</Icon>
      </span>
      <h3 className="text-xl font-extrabold">{title}</h3>
      <p className="text-[15px] text-ink-faint">
        <HanjaText text={text} />
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Options({ hasStats }: { hasStats: boolean }) {
  return (
    <section
      id="options"
      aria-labelledby="options-title"
      className="mx-auto flex max-w-[1120px] scroll-mt-16 flex-col gap-8 px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="flex max-w-[640px] flex-col gap-2.5">
        <h2 id="options-title" className={SECTION_TITLE}>
          원하는 조건으로 골라 보세요
        </h2>
        <p className={SECTION_LEAD}>조건을 고르면 거기에 맞는 이름만 보여 드려요.</p>
      </div>
      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
          <span className="rounded-full bg-sky-light px-3 py-1 text-sm font-bold text-sea-deep">기본으로 들어가요</span>
          <h3 className="text-[22px] font-extrabold">부족한 오행을 채워요</h3>
        </div>
        <p className="text-ink-soft">
          사주에 부족한 기운을 이름의 한자와 소리로 채워요. 이름핏에서 이 다섯 색은 늘 오행을 뜻해요.
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-2.5">
          {ELEMENT_CELLS.map((e) => (
            <div key={e.hanja} className={cn("flex flex-col gap-1 rounded-[20px] p-4", e.box)}>
              <span className={cn("mb-2 block h-2 rounded-full", e.bar)} />
              <span className="font-serif text-[34px] font-bold leading-[1.2]">{e.hanja}</span>
              <span className="text-[17px] font-extrabold">{e.name}</span>
              <span className="text-sm">
                <HanjaText text={e.text} />
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-baseline gap-3">
        <h3 className="text-xl font-extrabold">여기에 조건을 더해요</h3>
        <span className="text-[15px] text-ink-faint">여러 개를 함께 골라도 돼요</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
        <ConditionCard
          title="소리부터"
          text="부르고 싶은 소리나 집안 돌림자를 먼저 정해요."
          icon={<path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />}
        >
          <span className={CHIP}>순우리말</span>
          {/* 코랄 글자는 한 화면에 한 번만 */}
          <span className="rounded-full border border-coral bg-card px-3 py-1 text-sm font-extrabold text-coral-text">
            무료
          </span>
          <span className={CHIP}>소리 먼저 정하기</span>
          <span className={CHIP}>돌림자</span>
        </ConditionCard>
        <ConditionCard
          title="흔한 정도"
          text="출생신고 통계로 흔한 이름과 드문 이름을 나눠요."
          icon={<path d="M5 20V10M12 20V4M19 20v-7" />}
        >
          {/* 희귀한 이름 우선순위는 통계가 있을 때만 켜진다. "요즘 많이 쓰는 이름"은 기능이 없다(인기 이름순은 2008년 이후 누적) */}
          {hasStats ? (
            <span className={CHIP}>흔하지 않은 이름</span>
          ) : (
            <span className="rounded-full bg-sand-light px-3 py-1 text-sm font-semibold text-sand-text">통계 준비 중</span>
          )}
        </ConditionCard>
        <ConditionCard
          title="해외에서도"
          text="영어로도 부르기 쉬운 이름을 골라요."
          icon={
            <>
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
            </>
          }
        >
          <span className={CHIP}>글로벌 이름</span>
        </ConditionCard>
        <ConditionCard
          title="우리 집 성씨"
          text="같은 정씨도 鄭과 丁은 획수가 달라요. 우리 집 한자로 계산해요."
          icon={
            <>
              <path d="M4 11l8-7 8 7v9H4z" />
              <path d="M10 20v-5h4v5" />
            </>
          }
        >
          <span className={CHIP}>성씨 한자 고르기</span>
          <span className={CHIP}>드문 성씨</span>
        </ConditionCard>
      </div>
    </section>
  );
}

const SCORE_PARTS = [
  { label: "사주 보완", value: SCORE_WEIGHTS.saju, text: "사주에 부족한 기운을 이름이 채우는지", bar: "bg-score-1 text-white" },
  { label: "수리", value: SCORE_WEIGHTS.suri, text: "획수로 보는 81수 4격 · 작명에서 전통적으로 쓰는 방식", bar: "bg-score-2 text-white" },
  { label: "발음 오행", value: SCORE_WEIGHTS.pronunciation, text: "이름 소리의 오행 흐름", bar: "bg-score-3 text-ink" },
  { label: "자원 오행", value: SCORE_WEIGHTS.resource, text: "한자 부수에 담긴 오행", bar: "bg-score-4 text-ink" },
];

function SourceCard({
  kicker,
  title,
  text,
  paper,
  otherView,
}: {
  kicker: string;
  title: string;
  text: string;
  paper?: boolean;
  /** 이름핏과 입장이 다른 연구 */
  otherView?: boolean;
}) {
  return (
    <div className="rounded-[18px] border bg-cream px-5 py-4">
      <p className={cn("text-xs font-bold", paper ? "text-sand-text" : "text-sea")}>{kicker}</p>
      <p className="font-extrabold">{title}</p>
      {otherView && (
        <span className="mt-1 inline-block rounded-full bg-sand-light px-2.5 py-0.5 text-xs font-bold text-sand-text">
          다른 입장
        </span>
      )}
      <p className="text-sm text-ink-faint">
        <HanjaText text={text} />
      </p>
    </div>
  );
}

function Sources({ hasStats }: { hasStats: boolean }) {
  return (
    <section id="sources" aria-labelledby="sources-title" className="scroll-mt-16 border-y bg-card">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-8 px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex max-w-[640px] flex-col gap-2.5">
          <h2 id="sources-title" className={SECTION_TITLE}>
            점수는 이렇게 매겨요
          </h2>
          <p className={SECTION_LEAD}>
            성명학의 네 가지 요소로 100점을 매기고, 어디서 나온 기준인지 모두 보여 드려요.
          </p>
        </div>
        <div className="flex flex-col gap-5 rounded-3xl border bg-cream p-5 sm:p-7">
          <div
            role="img"
            aria-label={`100점 구성: ${SCORE_PARTS.map((s) => `${s.label} ${s.value}점`).join(", ")}`}
            className="flex h-10 overflow-hidden rounded-[14px] text-[19px] font-extrabold"
          >
            {SCORE_PARTS.map((s) => (
              <span key={s.label} className={cn("flex items-center justify-center", s.bar)} style={{ width: `${s.value}%` }}>
                {s.value}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            {SCORE_PARTS.map((s) => (
              <div key={s.label} className="flex gap-3">
                <span aria-hidden="true" className={cn("mt-1.5 block size-3.5 flex-none rounded", s.bar)} />
                <div>
                  <p className="font-extrabold">
                    {s.label} {s.value}점
                  </p>
                  <p className="text-sm text-ink-faint">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 text-[15px] font-bold">
            <span className="rounded-full bg-sea px-3.5 py-1.5 text-white">S {GRADE_MIN.S}점 이상</span>
            <span className="rounded-full bg-sky-light px-3.5 py-1.5 text-sea-deep">A {GRADE_MIN.A}점 이상</span>
            <span className="rounded-full bg-sand-light px-3.5 py-1.5 text-sand-text">B {GRADE_MIN.B}점 이상</span>
          </div>
        </div>
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-baseline gap-3">
            <h3 className="text-xl font-extrabold">계산 자료와 참고 연구</h3>
            <span className="text-[15px] text-ink-faint">
              공공 자료로 계산하고, 사전으로 뜻을 확인하고, 성명학 논문을 참고했어요
            </span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-3">
            <SourceCard kicker="계산" title="인명용 한자 자료(Unihan)" text="이름에 쓸 수 있는 한자와 획수" />
            <SourceCard kicker="계산" title="통계청 성씨·본관 조사(2015)" text="성씨 목록과 성씨 한자" />
            <SourceCard kicker="뜻 확인" title="국립국어원 표준국어대사전" text="순우리말 이름의 뜻" />
            <SourceCard
              kicker={hasStats ? "통계" : "통계 · 준비 중"}
              title="대법원 출생신고 이름 통계"
              text={hasStats ? "이름이 얼마나 흔한지 · 기준일 표시" : "이름이 얼마나 흔한지"}
            />
          </div>
          <p className="mt-2 font-bold">참고한 연구</p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-3">
            <SourceCard
              paper
              kicker="이재승·김만태(2018) · 문화와융합 40(3)"
              title="한국 성씨한자의 자원오행에 대한 고찰"
              text="성씨 한자의 자원오행 판단과, 오행이 분명하지 않은 성씨를 따로 다루는 기준"
            />
            <SourceCard
              paper
              kicker="이재승(2019) · 동방문화와 사상 6"
              title="사주명조의 계량화를 통한 성명학적 용신법 고찰"
              text="사주를 수치로 계산해 필요한 오행을 찾고 이름에 담는 방식"
            />
            <SourceCard
              paper
              kicker="김기승·이종훈(2019) · 한국산학기술학회논문지 20(2)"
              title="훈민정음 한글발음의 성명학 적용 논점 고찰"
              text="발음 오행을 지나치게 엄격하게 쓰지 않도록 상극 감점을 줄이는 데 참고"
            />
          </div>
          <p className="mt-2 font-bold">입장이 다른 연구도 살폈어요</p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-3">
            <SourceCard
              paper
              otherView
              kicker="이재승·김만태(2018) · 한국융합인문학 6(3)"
              title="한글 순음·후음의 오행배속에 대한 성명학적 고찰"
              text="ㅇ·ㅎ을 水로 보는 해례본 방식을 지지해요. 이름핏은 작명에서 널리 쓰는, ㅇ·ㅎ을 土로 보는 방식을 따라요."
            />
          </div>
          <p className="text-sm text-ink-faint">점수 배점과 등급 기준은 위 자료와 연구를 참고해 이름핏이 정했어요.</p>
          {/* TODO: 전체 출처와 계산 방법 화면이 생기면 "전체 출처와 계산 방법 보기" 링크를 넣는다 */}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { title: "아이 정보 넣기", text: "성씨, 성별, 태어난 날과 시각", tone: "bg-score-1 text-white" },
  { title: "사주 분석", text: "아이에게 필요한 오행을 찾아요", tone: "bg-score-2 text-white" },
  { title: "이름 30개 받기", text: "점수순으로, 근거와 통계까지", noStatsText: "점수순으로, 근거까지", tone: "bg-score-3 text-ink" },
];

function Steps({ hasStats }: { hasStats: boolean }) {
  return (
    <section
      aria-labelledby="steps-title"
      className="mx-auto flex max-w-[1120px] flex-col gap-7 px-4 py-16 sm:px-6 sm:py-[72px]"
    >
      <h2 id="steps-title" className={SECTION_TITLE}>
        세 단계면 끝나요
      </h2>
      <ol className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex items-start gap-4 rounded-3xl border bg-card p-5">
            <span className={cn("flex size-11 flex-none items-center justify-center rounded-full text-[19px] font-extrabold", s.tone)}>
              {i + 1}
            </span>
            <div>
              <p className="text-lg font-extrabold">{s.title}</p>
              <p className="text-[15px] text-ink-faint">{(!hasStats && s.noStatsText) || s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SelfNaming({ hasStats }: { hasStats: boolean }) {
  return (
    <section
      id="self"
      aria-labelledby="self-title"
      className="mx-auto max-w-[1120px] scroll-mt-16 px-4 pb-16 sm:px-6 sm:pb-[72px]"
    >
      <div className="flex flex-wrap items-center gap-x-10 gap-y-6 rounded-3xl bg-sand-light p-6 sm:p-9">
        <div className="min-w-0 flex-[1_1_320px]">
          <h2 id="self-title" className="mb-2 text-[clamp(24px,3vw,32px)] font-extrabold leading-[1.3] tracking-tight">
            생각해 둔 이름이 있나요?
          </h2>
          <p className="text-ink-soft">
            {hasStats ? "점수와 근거, 출생 통계를" : "점수와 근거를"} 무료로 확인해 보세요. 한자는 다음 화면에서 골라요.
          </p>
        </div>
        {/* 입력한 성·이름을 직접 짓기 입력 화면에 미리 채운다. 생년월일은 그 화면에서 받는다 */}
        <form action="/naming/self" method="get" className="flex min-w-0 flex-[1_1_360px] flex-wrap items-end gap-2.5">
          <label className="flex flex-[0_1_90px] flex-col gap-1.5 text-sm font-bold">
            성
            <Input
              name="hs"
              placeholder="김"
              maxLength={2}
              pattern="[가-힣]{1,2}"
              title="한글 1~2자"
              required
              className="h-[52px] bg-card text-[17px]"
            />
          </label>
          <label className="flex flex-[1_1_140px] flex-col gap-1.5 text-sm font-bold">
            이름
            <Input
              name="hg"
              placeholder="서윤"
              maxLength={SELF_MAX_LENGTH}
              pattern={`[가-힣]{1,${SELF_MAX_LENGTH}}`}
              title={`한글 1~${SELF_MAX_LENGTH}자`}
              required
              className="h-[52px] bg-card text-[17px]"
            />
          </label>
          <Button type="submit" size="lg" className="max-sm:w-full px-6 font-extrabold">
            점수 보기
          </Button>
        </form>
      </div>
    </section>
  );
}

function NameCards() {
  return (
    <section aria-labelledby="card-title" className="border-y bg-card">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-10 px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-3.5">
          <h2 id="card-title" className={SECTION_TITLE}>
            돌·백일에 쓰는 이름 카드
          </h2>
          <p className={SECTION_LEAD}>이름과 뜻, 축하 문구를 담은 카드를 무료로 만들어 가족에게 보내요.</p>
          {/* TODO: 백일·돌 카드가 만들어지면 "준비 중"을 뗀다 (CLAUDE.md "다음 할 일") */}
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-ink px-4 py-2 text-[15px] font-bold text-white">이름 소개</span>
            <span className="rounded-full border border-input bg-cream px-4 py-2 text-[15px] font-semibold text-ink-faint">
              백일 · 준비 중
            </span>
            <span className="rounded-full border border-input bg-cream px-4 py-2 text-[15px] font-semibold text-ink-faint">
              돌 · 준비 중
            </span>
          </div>
          <p className="flex items-start gap-2 text-[15px] text-ink-soft">
            <Icon size={18} className="mt-0.5 flex-none text-sea">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </Icon>
            생년월일과 사주는 카드에 넣지 않아요
          </p>
        </div>
        <div className="flex min-w-0 flex-[1_1_420px] flex-wrap items-end justify-center gap-[18px]">
          <NameCardFrame className="h-[312px] w-[250px]" innerClassName="flex h-full flex-col items-center justify-center gap-1.5 p-4 text-center">
            <p className="text-xs font-bold text-sand-text">첫 돌을 축하해</p>
            <NameWithHanja name="김서윤" hanja="金瑞潤" nameSize={36} hanjaSize={16} />
            <p className="text-xs text-ink-faint">상서로울 서 · 윤택할 윤</p>
            <p className="mt-2.5 text-[15px]">밝고 건강하게 자라렴</p>
            <p className="mt-3.5 text-xs tracking-wider text-ink-faint">namefit.kr</p>
          </NameCardFrame>
          <NameCardFrame
            tone="sky"
            className="w-[300px] max-w-full rounded-3xl"
            innerClassName="flex min-h-[138px] flex-col justify-center gap-1 rounded-2xl px-[18px] py-3.5"
          >
            <p className="text-xs font-bold text-sea-deep">순우리말 이름</p>
            <NameWithHanja name="이윤슬" nameSize={30} />
            <p className="text-xs text-ink-soft">햇빛이나 달빛에 비치어 반짝이는 잔물결</p>
          </NameCardFrame>
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: "흔한 이름은 점수가 낮게 나오나요?",
    a: "아니요. 점수는 사주, 획수, 소리, 한자로만 매겨요. 얼마나 흔한지는 출생 통계로 따로 보여 드려요.",
    noStatsA: "아니요. 점수는 사주, 획수, 소리, 한자로만 매겨요. 얼마나 흔한지는 출생 통계가 준비되면 따로 보여 드려요.",
  },
  {
    q: "작명소마다 이름이 다른 건 왜 그런가요?",
    a: "필요한 오행을 찾는 법, 발음 오행을 나누는 법이 학파마다 달라서예요. 이름핏은 쓰는 기준과 출처를 공개해요.",
  },
  { q: "아이 정보는 안전한가요?", a: "공유 카드에는 생년월일과 사주가 들어가지 않아요." },
  { q: "리포트를 받은 뒤 기준이 바뀌면요?", a: "결제한 리포트는 받은 날의 내용 그대로 보관돼요." },
];

function Faq({ hasStats }: { hasStats: boolean }) {
  return (
    <section aria-labelledby="faq-title" className="mx-auto flex max-w-[820px] flex-col gap-5 px-4 py-16 sm:px-6 sm:py-20">
      <h2 id="faq-title" className="text-[clamp(26px,3.4vw,34px)] font-extrabold tracking-tight">
        자주 묻는 질문
      </h2>
      {FAQS.map((f) => (
        <details key={f.q} className="rounded-[18px] border bg-card px-5 py-3">
          <summary className="flex min-h-11 cursor-pointer items-center text-[17px] font-extrabold">{f.q}</summary>
          <p className="pb-2 pt-1 text-ink-soft">{(!hasStats && f.noStatsA) || f.a}</p>
        </details>
      ))}
    </section>
  );
}

function FinalCall({ hasStats }: { hasStats: boolean }) {
  return (
    <section aria-labelledby="end-title" className="mx-auto max-w-[1120px] px-4 pb-16 sm:px-6 sm:pb-20">
      <div className="relative isolate flex flex-col items-center gap-4 overflow-hidden rounded-[36px] bg-sand-light px-6 py-16 text-center">
        <span
          aria-hidden="true"
          className="absolute -bottom-[60px] -left-[50px] -z-10 h-[170px] w-[240px] bg-sky-pebble"
          style={{ borderRadius: "60% 40% 55% 45% / 55% 50% 50% 45%" }}
        />
        <span
          aria-hidden="true"
          className="absolute -right-10 -top-[50px] -z-10 h-40 w-[220px] bg-sand"
          style={{ borderRadius: "45% 55% 40% 60% / 50% 45% 55% 50%" }}
        />
        <h2 id="end-title" className="text-[clamp(26px,3.6vw,40px)] font-extrabold leading-[1.3] tracking-tight">
          우리 아이 이름, 오늘 받아 보세요
        </h2>
        <p className="text-[17px] text-ink-soft">
          추천 이름 30개와 점수, {hasStats ? "근거, 출생 통계까지" : "근거까지"} 무료예요.
        </p>
        <StartButton />
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-[1120px] flex-wrap justify-between gap-x-8 gap-y-3 px-4 pb-12 pt-8 text-sm text-ink-faint sm:px-6">
        <div className="flex flex-col gap-1">
          <span className="font-extrabold text-ink">이름핏</span>
          {/* TODO: 사업자 등록 후 "대표 ○○○ · 사업자등록번호 ○○○-○○-○○○○○"를 넣는다 */}
          <span>상호 이름핏</span>
          <span>
            문의{" "}
            <a href="mailto:namefit.kr@gmail.com" className="inline-flex min-h-11 items-center underline underline-offset-2">
              namefit.kr@gmail.com
            </a>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {/* TODO: 약관·개인정보처리방침 화면을 만들면 링크로 바꾼다 */}
          <span>이용약관 (준비 중)</span>
          <span>개인정보처리방침 (준비 중)</span>
          <a href="#sources" className="inline-flex min-h-11 items-center underline underline-offset-2">
            출처와 계산 방법
          </a>
        </div>
      </div>
    </footer>
  );
}

/** 첫 화면 (홍보 랜딩). 시안 docs/design-2026-10-25/Main.dc.html */
export function LandingPage({ stats }: { stats: LandingStats | null }) {
  const hasStats = stats !== null;
  return (
    <div className="overflow-x-clip break-keep">
      <main>
        <Hero stats={stats} />
        <Promises hasStats={hasStats} />
        <Why hasStats={hasStats} />
        <Stats stats={stats} />
        <Free hasStats={hasStats} />
        <Options hasStats={hasStats} />
        <Sources hasStats={hasStats} />
        <Steps hasStats={hasStats} />
        <SelfNaming hasStats={hasStats} />
        <NameCards />
        <Faq hasStats={hasStats} />
        <FinalCall hasStats={hasStats} />
      </main>
      <LandingFooter />
    </div>
  );
}
