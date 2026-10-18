import { createClient } from "@supabase/supabase-js";
import { parseNamingParams } from "@/lib/naming/params";
import { runNaming } from "@/lib/naming/service";
import { easeScore } from "@/lib/naming/native/score";
import type { NameGroup } from "@/lib/naming/recommend";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const SURNAMES: [string, string][] = [["김", "金"], ["이", "李"], ["박", "朴"], ["최", "崔"], ["정", "鄭"]];
const BIRTHS = [
  ["2024-11-20", "09:33", "jeju"], ["2024-11-20", "09:33", "seoul"], ["2024-05-10", "07:28", "seoul"],
  ["2023-01-05", "23:25", "seoul"], ["1987-07-15", "14:20", "seoul"], ["2022-08-08", "12:10", "seoul"],
  ["2025-12-24", "18:50", "seoul"], ["2024-09-02", "06:58", "seoul"], ["2025-03-03", "03:15", "seoul"],
  ["2025-07-21", "16:40", "seoul"],
];
const CASES: Record<string, string>[] = [
  { surname: "김", sh: "金", date: "2022-02-10", time: "10:30", place: "seoul", gender: "female", len: "any" },
  ...SURNAMES.flatMap(([s, sh]) => BIRTHS.map(([date, time, place]) => ({ surname: s, sh, date, time, place }))),
];
const END = new Set("린원호율영안온우현진연");
const POS = Number(process.env.POS ?? 0.85);
type V = { name: string; ease: boolean; pos: boolean; cap: boolean };
const VARIANTS: V[] = [
  { name: "0 지금", ease: false, pos: false, cap: false },
  { name: "A 첫소리 3개 제한", ease: false, pos: false, cap: true },
  { name: "B 부르기 쉬움 규칙", ease: true, pos: false, cap: false },
  { name: `C 끝 글자 소리 감점(×${POS})`, ease: false, pos: true, cap: false },
  { name: "B+C", ease: true, pos: true, cap: false },
  { name: "A+B+C", ease: true, pos: true, cap: true },
];
const firstOf = (g: NameGroup) => [...g.hangul][0];
function capOrder(groups: NameGroup[]) {
  const cnt = new Map<string, number>(); const keep: NameGroup[] = [], rest: NameGroup[] = [];
  for (const g of groups) { const k = firstOf(g); const n = cnt.get(k) ?? 0; if (n < 3) { keep.push(g); cnt.set(k, n + 1); } else rest.push(g); }
  return [...keep, ...rest];
}
(async () => {
  const base: string[][] = [];
  for (const v of VARIANTS) {
    (globalThis as any).__TREND_ADJ = v.ease || v.pos ? (fixed: string, given: string, t: number) => {
      let x = t;
      if (v.ease) {
        const e = easeScore(fixed, given);
        const extra = e.penalties.filter((p) => !p.reason.startsWith("이름에 ")).reduce((s, p) => s + p.points, 0);
        x *= Math.max(0, 1 - Math.min(100, extra) / 100);
      }
      if (v.pos && [...given].length === 2 && END.has([...given][0])) x *= POS;
      return x;
    } : undefined;
    let maxOver3 = 0, sumMax = 0, sumDistinct = 0, changed = 0, short = 0; const grades = { S: 0, A: 0, B: 0, C: 0 };
    const lines: string[] = [];
    for (let i = 0; i < CASES.length; i++) {
      const p = parseNamingParams(CASES[i]); if (!p.ok) throw p.error;
      const r = await runNaming(supabase, p.value); if (!r.ok) throw r.error;
      const order = v.cap ? capOrder(r.groups) : r.groups;
      const top = order.slice(0, 30);
      const names = top.map((g) => g.hangul);
      if (v.name.startsWith("0")) base[i] = names; else changed += names.filter((n) => !base[i].includes(n)).length;
      const cnt = new Map<string, number>(); for (const g of top) cnt.set(firstOf(g), (cnt.get(firstOf(g)) ?? 0) + 1);
      const mx = Math.max(...cnt.values()); sumMax += mx; if (mx > 3) maxOver3++; sumDistinct += cnt.size; if (top.length < 30) short++;
      for (const g of top) grades[g.options[0].analysis.grade]++;
      if (i === 0) lines.push(top.map((g, j) => `${j + 1}.${g.hangul}(${g.options[0].givenName.map((c) => c.hanja).join("")} ${g.options[0].analysis.grade})`).join(" "),
        "  첫 글자: " + [...cnt].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}${n}`).join(" "));
    }
    const n = CASES.length;
    console.log(`\n### ${v.name}`);
    console.log(`표본 ${n}건 | 같은 첫 글자 최대 평균 ${(sumMax / n).toFixed(1)} | 4개 이상 몰린 사례 ${maxOver3}건 | 첫 글자 종류 평균 ${(sumDistinct / n).toFixed(1)} | 30개 못 채움 ${short}건 | 지금 대비 상위 30 바뀐 이름 ${changed}개 (${((changed / (n * 30)) * 100).toFixed(1)}%) | 상위 30 등급 S${grades.S} A${grades.A} B${grades.B} C${grades.C}`);
    console.log("신고 사례(김, 2022-02-10 10:30 서울, 여):"); for (const l of lines) console.log(l);
  }
})();
