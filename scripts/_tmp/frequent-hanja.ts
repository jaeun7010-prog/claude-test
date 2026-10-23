// 岷·池·澨·島가 상위 추천에 자주 뽑히는 원인 확인: 같은 음 후보와 획수·자원오행·뜻 등급 비교, 표본 상위 30에서 나온 횟수
import { createClient } from "@supabase/supabase-js";
import { fetchPool } from "@/lib/naming/hanja-repo";
import { parseNamingParams } from "@/lib/naming/params";
import { runNaming, DISPLAY_LIMIT } from "@/lib/naming/service";
import { rankByPriorities, firstSoundKey, DEFAULT_PRIORITIES } from "@/lib/naming/priorities";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const WANT: [string, string][] = [["岷", "민"], ["池", "지"], ["澨", "서"], ["島", "도"]];
const SURNAMES: [string, string][] = [["김", "金"], ["이", "李"], ["박", "朴"], ["최", "崔"], ["정", "鄭"]];
const BIRTHS = [["2024-11-20","09:33","jeju"],["2024-11-20","09:33","seoul"],["2024-05-10","07:28","seoul"],["2023-01-05","23:25","seoul"],["1987-07-15","14:20","seoul"],["2022-08-08","12:10","seoul"],["2025-12-24","18:50","seoul"],["2024-09-02","06:58","seoul"],["2025-03-03","03:15","seoul"],["2025-07-21","16:40","seoul"]];
(async () => {
  const pool = await fetchPool(s);
  for (const [h, e] of WANT) {
    const same = pool.filter((c) => c.eum === e && c.suitability !== "obscure");
    console.log(`\n== ${h}(${e}) — 같은 음 자동 추천 후보 ${same.length}자 (애매 제외)`);
    for (const c of same.sort((a, b) => (a.element ?? "").localeCompare(b.element ?? "") || a.strokes - b.strokes))
      console.log(`${c.hanja === h ? "▶" : " "} ${c.hanja}\t${c.strokes}획\t${c.element ?? "-"}\t${c.suitability}\t${c.hun ?? ""}\t${(c.meaning ?? "").split(";")[0].slice(0, 30)}`);
  }
  const count: Record<string, { n: number; pos: number[]; yongsin: Record<string, number>; ex: Set<string> }> = {};
  for (const gender of ["female", "male"]) for (const [sn, sh] of SURNAMES) for (const [date, time, place] of BIRTHS) {
    const p = parseNamingParams({ surname: sn, sh, date, time, place, gender }); if (!p.ok) throw p.error;
    const r = await runNaming(s, p.value); if (!r.ok) throw r.error;
    const items = r.groups.map((g) => ({ g, demoted: g.soundFill, metrics: { baseScore: g.options[0].baseScore, globalScore: g.options[0].globalScore, births: null, everListed: null } }));
    const shown = rankByPriorities(items, DEFAULT_PRIORITIES, false, DISPLAY_LIMIT, (i) => !!i.demoted, (i) => firstSoundKey([...i.g.hangul][0])).map((x) => x.item.g);
    for (const g of shown) g.options[0].givenName.forEach((c, i) => {
      if (!WANT.some(([h]) => h === c.hanja)) return;
      const m = (count[c.hanja] ??= { n: 0, pos: [0, 0], yongsin: {}, ex: new Set() });
      m.n++; m.pos[i]++; const y = (r as any).saju?.yongsin?.yongsin ?? "?"; m.yongsin[y] = (m.yongsin[y] ?? 0) + 1;
      if (m.ex.size < 4) m.ex.add(`${sn}${g.hangul}(${g.options[0].givenName.map((x) => x.hanja).join("")})`);
    });
  }
  console.log("\n표본 100건(여·남 × 50) 화면 상위 30에서 나온 횟수");
  for (const [h, m] of Object.entries(count)) console.log(h, m.n, `첫 글자 ${m.pos[0]} · 끝 글자 ${m.pos[1]}`, JSON.stringify(m.yongsin), [...m.ex].join(" "));
})();
