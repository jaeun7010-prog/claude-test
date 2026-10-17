/**
 * 1단계(출생지 경도 보정) 전후 비교: npx tsx --env-file=.env.local scripts/compare-birthplace.ts
 * 보정 전 = 예전 동작(출생지와 상관없이 Asia/Seoul 시계 + 서울 경도).
 * 용신이 바뀐 사례는 추천 상위 이름의 등급 분포도 전후로 비교한다 (Supabase 한자 사전 필요).
 */
import { createClient } from "@supabase/supabase-js";

import { analyzeSaju } from "@/lib/saju";
import { parseNamingParams } from "@/lib/naming/params";
import { DISPLAY_LIMIT, runNaming } from "@/lib/naming/service";

interface Case {
  label: string;
  date: string;
  time: string;
  place: string;
  /** place=etc일 때 */
  tz?: string;
  lon?: string;
}

const CASES: Case[] = [
  { label: "A 서울", date: "2024-05-10", time: "07:28", place: "seoul" },
  { label: "A 부산", date: "2024-05-10", time: "07:28", place: "busan" },
  { label: "A 제주", date: "2024-05-10", time: "07:28", place: "jeju" },
  { label: "B 서울", date: "2024-11-20", time: "09:33", place: "seoul" },
  { label: "B 부산", date: "2024-11-20", time: "09:33", place: "busan" },
  { label: "B 제주", date: "2024-11-20", time: "09:33", place: "jeju" },
  { label: "C 서울", date: "2023-01-05", time: "23:25", place: "seoul" },
  { label: "C 부산", date: "2023-01-05", time: "23:25", place: "busan" },
  { label: "C 제주", date: "2023-01-05", time: "23:25", place: "jeju" },
  { label: "D 서울(서머타임)", date: "1987-07-15", time: "14:20", place: "seoul" },
  { label: "D 부산(서머타임)", date: "1987-07-15", time: "14:20", place: "busan" },
  { label: "E 서울", date: "2022-08-08", time: "12:10", place: "seoul" },
  { label: "E 제주", date: "2022-08-08", time: "12:10", place: "jeju" },
  { label: "F 뉴욕", date: "2024-03-01", time: "10:00", place: "newyork" },
  { label: "F 로스앤젤레스(서머타임)", date: "2023-06-20", time: "08:30", place: "losangeles" },
  { label: "F 도쿄", date: "2024-05-10", time: "07:28", place: "tokyo" },
  { label: "F 런던", date: "2025-12-24", time: "18:50", place: "london" },
  { label: "F 기타(토론토 근교 직접 입력)", date: "2024-09-02", time: "06:58", place: "etc", tz: "America/Toronto", lon: "-80.49" },
];

const raw = (c: Case, legacy: boolean) => ({
  surname: "김",
  sh: "金",
  date: c.date,
  time: c.time,
  ...(legacy ? {} : { place: c.place, tz: c.tz, lon: c.lon }),
});

const parse = (c: Case, legacy: boolean) => {
  const r = parseNamingParams(raw(c, legacy));
  if (!r.ok) throw new Error(`${c.label}: ${r.error}`);
  return r.value;
};

const fmt = (h: number, m: number) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

const rows: string[] = [];
const changed: Case[] = [];
for (const c of CASES) {
  const before = analyzeSaju(parse(c, true).birth);
  const after = analyzeSaju(parse(c, false).birth);
  const tc = after.timeCorrection!;
  const yb = `${before.yongsin.yongsin}(${before.yongsin.method})`;
  const ya = `${after.yongsin.yongsin}(${after.yongsin.method})`;
  /** 보정 전과 다르면 굵게 */
  const mark = (a: string, b: string) => (a === b ? b : `**${b}**`);
  const pb = `${before.pillars.year.ko} ${before.pillars.day.ko} ${before.pillars.hour!.ko}`;
  const pa = `${after.pillars.year.ko} ${after.pillars.day.ko} ${after.pillars.hour!.ko}`;
  if (yb !== ya) changed.push(c);
  rows.push(
    `| ${c.label} | ${c.date} ${c.time} | ${tc.minutes >= 0 ? "+" : ""}${tc.minutes}분 → ${fmt(tc.corrected.hour, tc.corrected.minute)} | ` +
      `${pb} | ${mark(pb, pa)} | ${tc.hourChanged || tc.dayChanged ? "표시" : "-"} | ${yb} | ${mark(yb, ya)} |`
  );
}

console.log("| 사례 | 시계 시각 | 보정 → 평균태양시 | 보정 전 연·일·시주 | 보정 후 연·일·시주 | 바뀜 알림 | 보정 전 용신 | 보정 후 용신 |");
console.log("|---|---|---|---|---|---|---|---|");
for (const r of rows) console.log(r);

async function gradeDistribution() {
  if (changed.length === 0) {
    console.log("\n용신이 바뀐 사례가 없어 등급 분포는 그대로입니다.");
    return;
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const dist = async (c: Case, legacy: boolean) => {
    const r = await runNaming(supabase, parse(c, legacy));
    if (!r.ok) throw new Error(r.error);
    const count: Record<string, number> = { S: 0, A: 0, B: 0, C: 0 };
    for (const g of r.groups.slice(0, DISPLAY_LIMIT)) count[g.options[0].analysis.grade ?? "C"]++;
    return `S${count.S} A${count.A} B${count.B} C${count.C}`;
  };
  console.log(`\n| 용신이 바뀐 사례 | 상위 ${DISPLAY_LIMIT}개 등급 (보정 전) | (보정 후) |`);
  console.log("|---|---|---|");
  for (const c of changed) console.log(`| ${c.label} | ${await dist(c, true)} | ${await dist(c, false)} |`);
}

void gradeDistribution();
