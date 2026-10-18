import { createClient } from "@supabase/supabase-js";
import { parseNamingParams } from "@/lib/naming/params";
import { runNaming, DISPLAY_LIMIT } from "@/lib/naming/service";
import { rankByPriorities, firstSoundKey, DEFAULT_PRIORITIES } from "@/lib/naming/priorities";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const SURNAMES: [string, string][] = [["김", "金"], ["이", "李"], ["박", "朴"], ["최", "崔"], ["정", "鄭"]];
const BIRTHS = [["2024-11-20","09:33","jeju"],["2024-11-20","09:33","seoul"],["2024-05-10","07:28","seoul"],["2023-01-05","23:25","seoul"],["1987-07-15","14:20","seoul"],["2022-08-08","12:10","seoul"],["2025-12-24","18:50","seoul"],["2024-09-02","06:58","seoul"],["2025-03-03","03:15","seoul"],["2025-07-21","16:40","seoul"]];
const CASES: Record<string,string>[] = [{ surname: "김", sh: "金", date: "2022-02-10", time: "10:30", place: "seoul", gender: "female", len: "any" },
  ...SURNAMES.flatMap(([s, sh]) => BIRTHS.map(([date, time, place]) => ({ surname: s, sh, date, time, place })))];
(async () => {
  let over = 0, short = 0, sumMax = 0;
  for (let i = 0; i < CASES.length; i++) {
    const p = parseNamingParams(CASES[i]); if (!p.ok) throw p.error;
    const r = await runNaming(supabase, p.value); if (!r.ok) throw r.error;
    const items = r.groups.map((g) => ({ g, metrics: { baseScore: g.options[0].baseScore, globalScore: g.options[0].globalScore, births: null, everListed: null } }));
    const shown = rankByPriorities(items, DEFAULT_PRIORITIES, false, DISPLAY_LIMIT, undefined, (x) => firstSoundKey([...x.g.hangul][0]));
    const cnt = new Map<string, number>(); for (const { item } of shown) { const k = firstSoundKey([...item.g.hangul][0]); cnt.set(k, (cnt.get(k) ?? 0) + 1); }
    const mx = Math.max(...cnt.values()); sumMax += mx; if (mx > 3) over++; if (shown.length < 30) short++;
    if (i === 0) console.log(shown.map(({ item }, j) => `${j + 1}.${item.g.hangul}`).join(" "), "\n첫소리:", [...cnt].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}${n}`).join(" "));
  }
  console.log(`표본 ${CASES.length}건: 같은 첫소리 최대 평균 ${(sumMax / CASES.length).toFixed(1)}, 4개 이상 ${over}건, 30개 못 채움 ${short}건`);
})();
