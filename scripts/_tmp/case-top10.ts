import { createClient } from "@supabase/supabase-js";
import { parseNamingParams } from "@/lib/naming/params";
import { runNaming, DISPLAY_LIMIT } from "@/lib/naming/service";
import { rankByPriorities, firstSoundKey, DEFAULT_PRIORITIES } from "@/lib/naming/priorities";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
(async () => {
  for (const g of ["female", "male"]) {
    const p = parseNamingParams({ surname: "김", sh: "金", date: "2022-02-10", time: "10:30", place: "seoul", gender: g, len: "any" }); if (!p.ok) throw p.error;
    const r = await runNaming(supabase, p.value); if (!r.ok) throw r.error;
    const items = r.groups.map((x) => ({ x, metrics: { baseScore: x.options[0].baseScore, globalScore: 0, births: null, everListed: null } }));
    const shown = rankByPriorities(items, DEFAULT_PRIORITIES, false, DISPLAY_LIMIT, undefined, (i) => firstSoundKey([...i.x.hangul][0]));
    console.log(g, shown.slice(0, 10).map(({ item }, j) => `${j + 1}.${item.x.hangul}(${item.x.options[0].givenName.map((c) => c.hanja).join("")} ${item.x.options[0].analysis.grade})`).join(" "));
  }
})();
