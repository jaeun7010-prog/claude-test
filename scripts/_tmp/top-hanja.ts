import { createClient } from "@supabase/supabase-js";
import { parseNamingParams } from "@/lib/naming/params";
import { runNaming, DISPLAY_LIMIT } from "@/lib/naming/service";
import { rankByPriorities, firstSoundKey, DEFAULT_PRIORITIES } from "@/lib/naming/priorities";
import { writeFileSync } from "fs";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const SURNAMES: [string, string][] = [["김", "金"], ["이", "李"], ["박", "朴"], ["최", "崔"], ["정", "鄭"]];
const BIRTHS = [["2024-11-20","09:33","jeju"],["2024-11-20","09:33","seoul"],["2024-05-10","07:28","seoul"],["2023-01-05","23:25","seoul"],["1987-07-15","14:20","seoul"],["2022-08-08","12:10","seoul"],["2025-12-24","18:50","seoul"],["2024-09-02","06:58","seoul"],["2025-03-03","03:15","seoul"],["2025-07-21","16:40","seoul"]];
const CASES: Record<string,string>[] = [{ surname: "김", sh: "金", date: "2022-02-10", time: "10:30", place: "seoul", gender: "female", len: "any" },
  ...SURNAMES.flatMap(([s, sh]) => BIRTHS.map(([date, time, place]) => ({ surname: s, sh, date, time, place })))];
const POS = /\b(bright|brightness|brilliant|shine|shining|light|luminous|wise|wisdom|clever|intelligent|virtue|virtuous|benevolent|benevolence|kind|kindness|gentle|graceful|elegant|refined|beautiful|beauty|pretty|lovely|jade|gem|jewel|pearl|precious|fortune|fortunate|auspicious|lucky|happy|happiness|joy|joyful|peace|peaceful|harmony|harmonious|prosper|prosperous|abundant|flourish|flourishing|noble|honor|honour|honest|sincere|faithful|loyal|talent|talented|excellent|outstanding|great|grand|lofty|high|vast|spring|dawn|sun|moon|star|cloud|flower|blossom|orchid|bamboo|pine|jade|rain|sky|heaven|sea|ocean|river|clear|pure|fragrant|fragrance|sweet|warm|gentle|soft)\b/i;
(async () => {
  const seen = new Map<string, { c: any; n: number; names: Set<string> }>();
  for (const q of CASES) {
    const p = parseNamingParams(q); if (!p.ok) throw p.error;
    const r = await runNaming(supabase, p.value); if (!r.ok) throw r.error;
    const items = r.groups.map((g) => ({ g, metrics: { baseScore: g.options[0].baseScore, globalScore: 0, births: null, everListed: null } }));
    const shown = rankByPriorities(items, DEFAULT_PRIORITIES, false, DISPLAY_LIMIT, undefined, (x) => firstSoundKey([...x.g.hangul][0]));
    for (const { item } of shown) for (const c of item.g.options[0].givenName) {
      const k = c.hanja + c.eum; const e = seen.get(k) ?? { c, n: 0, names: new Set() }; e.n++; e.names.add(item.g.hangul); seen.set(k, e);
    }
  }
  const rows = [...seen.values()].sort((a, b) => b.n - a.n).map(({ c, n, names }) => {
    const first = (c.meaning ?? "").split(/[;,]/, 1)[0];
    const m = (c.meaning ?? "").match(POS);
    return [c.hanja, c.eum, c.hun ?? "", c.suitability, n, first, m ? m[0] : "", POS.test(first) ? "첫뜻" : m ? "뒤뜻" : "", (c.meaning ?? "").slice(0, 90), [...names].slice(0, 4).join(",")].join("\t");
  });
  writeFileSync("scripts/_tmp/top-hanja.tsv", "한자\t음\t훈\t등급\t등장\t첫뜻\t긍정단어\t긍정위치\t뜻풀이\t이름예\n" + rows.join("\n"));
  console.log("글자 수", rows.length);
})();
