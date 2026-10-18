import { createClient } from "@supabase/supabase-js";
import { parseNamingParams } from "@/lib/naming/params";
import { runNaming, DISPLAY_LIMIT } from "@/lib/naming/service";
import { rankByPriorities, firstSoundKey, DEFAULT_PRIORITIES } from "@/lib/naming/priorities";
import type { NameGroup } from "@/lib/naming/recommend";
import { buildSounds } from "./name-sounds-draft";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const SOUNDS = buildSounds();
const SURNAMES: [string, string][] = [["김", "金"], ["이", "李"], ["박", "朴"], ["최", "崔"], ["정", "鄭"]];
const BIRTHS = [["2024-11-20","09:33","jeju"],["2024-11-20","09:33","seoul"],["2024-05-10","07:28","seoul"],["2023-01-05","23:25","seoul"],["1987-07-15","14:20","seoul"],["2022-08-08","12:10","seoul"],["2025-12-24","18:50","seoul"],["2024-09-02","06:58","seoul"],["2025-03-03","03:15","seoul"],["2025-07-21","16:40","seoul"]];
const BONUSES = (process.env.BONUS ?? "off,0,5,10,15").split(",");

function setup(gender: string, bonus: string) {
  if (bonus === "off") { delete (globalThis as any).__SOUND_ADJ; return () => false; }
  const B = Number(bonus);
  const allowed = SOUNDS.filter((s) => gender === "neutral" || s.gender === "both" || s.gender === gender);
  const listed = new Set(allowed.map((s) => s.sound));
  const opposite = new Set(SOUNDS.filter((s) => !listed.has(s.sound)).map((s) => s.sound));
  const firstSet = new Set(allowed.filter((s) => [...s.sound].length === 2).map((s) => [...s.sound][0]));
  const lastSet = new Set(allowed.filter((s) => [...s.sound].length === 2).map((s) => [...s.sound][1]));
  (globalThis as any).__SOUND_ADJ = (given: string, t: number, minTrend: number) => {
    if (listed.has(given)) return Math.max(t, minTrend) + B / 15;
    if (opposite.has(given)) return -1;
    const sy = [...given];
    if (sy.length === 1) return lastSet.has(sy[0]) ? t : -1;
    if (sy.length === 2) return firstSet.has(sy[0]) && lastSet.has(sy[1]) ? t : -1;
    return t;
  };
  return (name: string) => listed.has(name);
}
const show = (gs: NameGroup[]) => {
  const items = gs.map((x) => ({ x, metrics: { baseScore: x.options[0].baseScore, globalScore: 0, births: null, everListed: null } }));
  return rankByPriorities(items, DEFAULT_PRIORITIES, false, DISPLAY_LIMIT, undefined, (i) => firstSoundKey([...i.x.hangul][0])).map(({ item }) => item.x);
};
const fmt = (g: NameGroup | undefined, isListed: (n: string) => boolean) => g ? `${isListed(g.hangul) ? "" : "·"}${g.hangul} ${g.options[0].givenName.map((c) => c.hanja).join("")} ${g.options[0].analysis.grade}${g.options[0].analysis.totalScore.toFixed(1)}` : "-";
const listedAll = new Set(SOUNDS.map((s) => s.sound));

(async () => {
  const top15: Record<string, string[][]> = {};
  for (const bonus of BONUSES) {
    const out: string[] = [];
    for (const gender of ["female", "male"]) {
      const gr = { S: 0, A: 0, B: 0, C: 0 }; let l30 = 0, l15 = 0, short = 0, n = 0;
      for (const [s, sh] of SURNAMES) for (const [date, time, place] of BIRTHS) {
        const isListed = setup(gender, bonus);
        const p = parseNamingParams({ surname: s, sh, date, time, place, gender }); if (!p.ok) throw p.error;
        const r = await runNaming(supabase, p.value); if (!r.ok) throw r.error;
        const top = show(r.groups); n++;
        if (top.length < 30) short++;
        for (const g of top) gr[g.options[0].analysis.grade]++;
        const inList = (g: NameGroup) => (bonus === "off" ? listedAll.has(g.hangul) : isListed(g.hangul));
        l30 += top.filter(inList).length / Math.max(1, top.length); l15 += top.slice(0, 15).filter(inList).length / Math.max(1, Math.min(15, top.length));
      }
      out.push(`${gender === "female" ? "여" : "남"}: 목록 소리 비율 상위30 ${((l30 / n) * 100).toFixed(0)}% · 상위15 ${((l15 / n) * 100).toFixed(0)}% | 등급 S${gr.S} A${gr.A} B${gr.B} C${gr.C} | 30개 미만 ${short}건`);
      for (const [s, sh] of [["김", "金"], ["이", "李"], ["박", "朴"]]) {
        const isListed = setup(gender, bonus);
        const p = parseNamingParams({ surname: s, sh, date: "2022-02-10", time: "10:30", place: "seoul", gender, len: "any" }); if (!p.ok) throw p.error;
        const r = await runNaming(supabase, p.value); if (!r.ok) throw r.error;
        const key = `${s}씨 ${gender === "female" ? "여자아이" : "남자아이"}`;
        (top15[key] ??= []).push(show(r.groups).slice(0, 15).map((g) => fmt(g, bonus === "off" ? (x) => listedAll.has(x) : isListed)));
      }
    }
    console.log(`\n## 가점 ${bonus === "off" ? "지금(적용 안 함)" : bonus === "0" ? "0 (거르기만)" : "+" + bonus}`); for (const l of out) console.log(l);
  }
  for (const [k, cols] of Object.entries(top15)) {
    console.log(`\n### ${k}\n순위\t${BONUSES.map((b) => (b === "off" ? "지금" : b === "0" ? "거르기만" : "+" + b)).join("\t")}`);
    for (let i = 0; i < 15; i++) console.log(`${i + 1}\t${cols.map((c) => c[i] ?? "-").join("\t")}`);
  }
})();
