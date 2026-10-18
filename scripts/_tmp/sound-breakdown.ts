import { createClient } from "@supabase/supabase-js";
import { parseNamingParams } from "@/lib/naming/params";
import { runNaming } from "@/lib/naming/service";
import { soundFirst, show } from "./sound-first";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const SURNAMES: [string, string][] = [["김", "金"], ["이", "李"], ["박", "朴"], ["최", "崔"], ["정", "鄭"]];
const BIRTHS = [["2024-11-20","09:33","jeju"],["2024-11-20","09:33","seoul"],["2024-05-10","07:28","seoul"],["2023-01-05","23:25","seoul"],["1987-07-15","14:20","seoul"],["2022-08-08","12:10","seoul"],["2025-12-24","18:50","seoul"],["2024-09-02","06:58","seoul"],["2025-03-03","03:15","seoul"],["2025-07-21","16:40","seoul"]];
(async () => {
  const acc = { cur: { saju: 0, suri: 0, pronunciation: 0, resource: 0, total: 0, meaning: 0, n: 0 }, snd: { saju: 0, suri: 0, pronunciation: 0, resource: 0, total: 0, meaning: 0, n: 0 } } as any;
  for (const [s, sh] of SURNAMES) for (const [date, time, place] of BIRTHS) {
    const p = parseNamingParams({ surname: s, sh, date, time, place, gender: "female" }); if (!p.ok) throw p.error;
    const cur = await runNaming(supabase, p.value); if (!cur.ok) throw cur.error;
    for (const [k, list] of [["cur", show(cur.groups)], ["snd", show((await soundFirst(p.value)).groups)]] as const)
      for (const x of list) { const a = x.options[0].analysis, o = acc[k]; for (const f of ["saju", "suri", "pronunciation", "resource"]) o[f] += (a.breakdown as any)[f] ?? 0; o.total += a.totalScore; o.meaning += x.options[0].meaning; o.n++; }
  }
  for (const k of ["cur", "snd"]) { const o = acc[k]; console.log(k, ["saju", "suri", "pronunciation", "resource", "total", "meaning"].map((f) => `${f} ${(o[f] / o.n).toFixed(1 + (f === "meaning" ? 1 : 0))}`).join(" · ")); }
})();
