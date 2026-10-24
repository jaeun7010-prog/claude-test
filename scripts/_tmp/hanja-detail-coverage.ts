// 한자 상세 풀이 대상 글자 수: meaning-coverage.ts 와 같은 표본(성 5 × 사주 10 × 여·남, 화면 상위 30)에 나온 이름 글자.
import { createClient } from "@supabase/supabase-js";
import { parseNamingParams } from "@/lib/naming/params";
import { runNaming, DISPLAY_LIMIT } from "@/lib/naming/service";
import { rankByPriorities, firstSoundKey, DEFAULT_PRIORITIES } from "@/lib/naming/priorities";
import { NAME_MEANING } from "@/lib/naming/name-meaning-table";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const SURNAMES: [string, string][] = [["김", "金"], ["이", "李"], ["박", "朴"], ["최", "崔"], ["정", "鄭"]];
const BIRTHS = [["2024-11-20","09:33","jeju"],["2024-11-20","09:33","seoul"],["2024-05-10","07:28","seoul"],["2023-01-05","23:25","seoul"],["1987-07-15","14:20","seoul"],["2022-08-08","12:10","seoul"],["2025-12-24","18:50","seoul"],["2024-09-02","06:58","seoul"],["2025-03-03","03:15","seoul"],["2025-07-21","16:40","seoul"]];
(async () => {
  const seen: Record<string, { n: number; all: number; hun: string; el: string }> = {};
  for (const gender of ["female", "male"]) for (const [s, sh] of SURNAMES) for (const [date, time, place] of BIRTHS) {
    const p = parseNamingParams({ surname: s, sh, date, time, place, gender }); if (!p.ok) throw p.error;
    const r = await runNaming(supabase, p.value); if (!r.ok) throw r.error;
    const items = r.groups.map((g) => ({ g, demoted: g.soundFill, metrics: { baseScore: g.options[0].baseScore, globalScore: g.options[0].globalScore, births: null, everListed: null } }));
    const shown = rankByPriorities(items, DEFAULT_PRIORITIES, false, DISPLAY_LIMIT, (i) => !!i.demoted, (i) => firstSoundKey([...i.g.hangul][0])).map((x) => x.item.g);
    for (const g of shown) {
      g.options[0].givenName.forEach((c) => ((seen[`${c.hanja}|${c.eum}`] ??= { n: 0, all: 0, hun: c.hun ?? "", el: c.element ?? "" }).n++));
      for (const o of g.options) o.givenName.forEach((c) => ((seen[`${c.hanja}|${c.eum}`] ??= { n: 0, all: 0, hun: c.hun ?? "", el: c.element ?? "" }).all++));
    }
  }
  const keys = Object.keys(seen), rep = keys.filter((k) => seen[k].n > 0);
  console.log(`대표 조합 글자 ${rep.length}자 (뜻 문구 있음 ${rep.filter((k) => NAME_MEANING[k]).length}) · 다른 조합 포함 ${keys.length}자 (뜻 문구 있음 ${keys.filter((k) => NAME_MEANING[k]).length})`);
  const sorted = rep.sort((a, b) => seen[b].n - seen[a].n); let cum = 0; const tot = sorted.reduce((a, k) => a + seen[k].n, 0);
  for (const cut of [50, 100, 150, 200, 300]) { cum = sorted.slice(0, cut).reduce((a, k) => a + seen[k].n, 0); console.log(`상위 ${cut}자가 대표 조합 글자 등장의 ${((cum / tot) * 100).toFixed(1)}%`); }
  if (process.env.ALLHUN) console.log(keys.map((k) => `${k.split("|")[0]}:${seen[k].hun}`).join(" "));
  const from = Number(process.env.FROM ?? 0), to = Number(process.env.TO ?? 0);
  sorted.slice(from, to).forEach((k, i) => console.log(`${from + i + 1}	${k}	${seen[k].hun}	${seen[k].el}	${seen[k].n}	${NAME_MEANING[k] ? NAME_MEANING[k].rel : "-"}`));
})();
