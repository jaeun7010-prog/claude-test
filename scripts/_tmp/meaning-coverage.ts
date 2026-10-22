import { createClient } from "@supabase/supabase-js";
import { parseNamingParams } from "@/lib/naming/params";
import { runNaming, DISPLAY_LIMIT } from "@/lib/naming/service";
import { rankByPriorities, firstSoundKey, DEFAULT_PRIORITIES } from "@/lib/naming/priorities";
import { nameMeaningOf } from "@/lib/naming/name-meaning";
import { NAME_MEANING, NAME_MEANING_NOUN, NAME_MEANING_VERB } from "@/lib/naming/name-meaning-table";
import { DRAFT } from "./meaning-draft";
if (process.env.DRAFT === "1") for (const [k, v] of Object.entries(DRAFT)) if (v) (NAME_MEANING as any)[k] = { and: v[0], rel: v[1], group: v[2] };
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const SURNAMES: [string, string][] = [["김", "金"], ["이", "李"], ["박", "朴"], ["최", "崔"], ["정", "鄭"]];
const BIRTHS = [["2024-11-20","09:33","jeju"],["2024-11-20","09:33","seoul"],["2024-05-10","07:28","seoul"],["2023-01-05","23:25","seoul"],["1987-07-15","14:20","seoul"],["2022-08-08","12:10","seoul"],["2025-12-24","18:50","seoul"],["2024-09-02","06:58","seoul"],["2025-03-03","03:15","seoul"],["2025-07-21","16:40","seoul"]];
const key = (c: { hanja: string; eum: string }) => `${c.hanja}|${c.eum}`;
(async () => {
  const miss: Record<string, { n: number; hun: string; examples: Set<string> }> = {};
  const total: Record<string, { cards: number; before: number; after: number }> = {};
  for (const gender of ["female", "male"]) {
    const t = (total[gender] = { cards: 0, before: 0, after: 0 });
    for (const [s, sh] of SURNAMES) for (const [date, time, place] of BIRTHS) {
      const p = parseNamingParams({ surname: s, sh, date, time, place, gender }); if (!p.ok) throw p.error;
      const r = await runNaming(supabase, p.value); if (!r.ok) throw r.error;
      const items = r.groups.map((g) => ({ g, demoted: g.soundFill, metrics: { baseScore: g.options[0].baseScore, globalScore: g.options[0].globalScore, births: null, everListed: null } }));
      const shown = rankByPriorities(items, DEFAULT_PRIORITIES, false, DISPLAY_LIMIT, (i) => !!i.demoted, (i) => firstSoundKey([...i.g.hangul][0])).map((x) => x.item.g);
      for (const g of shown) {
        const chars = g.options[0].givenName;
        t.cards++;
        const after = nameMeaningOf(chars);
        if (process.env.DRAFT === "1" && after) for (const c of chars) if (DRAFT[key(c)] && !(globalThis as any).__ex?.[key(c)]) ((globalThis as any).__ex ??= {})[key(c)] = `${s}${g.hangul}(${chars.map((x) => x.hanja).join("")}): ${after.sentence.replace(" 사람으로 자라길 바라는 뜻", "").replace(" 살아가길 바라는 뜻", " (살아가길)")}`;
        const ks = chars.map(key);
        const verbNoun = ks.length === 2 && !!(NAME_MEANING_VERB[ks[0]] ?? NAME_MEANING_VERB[ks[1]]) && !!(NAME_MEANING_VERB[ks[0]] ? NAME_MEANING_NOUN[ks[1]] : NAME_MEANING_NOUN[ks[0]]);
        const sameGroup = ks.length === 2 && ks.every((k) => NAME_MEANING[k]) && NAME_MEANING[ks[0]].group === NAME_MEANING[ks[1]].group;
        const before = after && (verbNoun || !sameGroup);
        if (!before) t.before++;
        if (!after) {
          t.after++;
          for (const c of chars) if (!NAME_MEANING[key(c)]) {
            const m = (miss[key(c)] ??= { n: 0, hun: c.hun ?? "", examples: new Set() });
            m.n++; if (m.examples.size < 3) m.examples.add(`${s}${g.hangul}`);
          }
        }
      }
    }
  }
  for (const [g, t] of Object.entries(total)) console.log(`${g === "female" ? "여" : "남"}: 카드 ${t.cards} · 뜻 없음 전 ${t.before} (${((t.before / t.cards) * 100).toFixed(1)}%) → 후 ${t.after} (${((t.after / t.cards) * 100).toFixed(1)}%)`);
  const all = Object.values(total).reduce((a, t) => ({ cards: a.cards + t.cards, before: a.before + t.before, after: a.after + t.after }), { cards: 0, before: 0, after: 0 });
  console.log(`합계: 카드 ${all.cards} · 전 ${((all.before / all.cards) * 100).toFixed(1)}% → 후 ${((all.after / all.cards) * 100).toFixed(1)}%`);
  if (process.env.DRAFT === "1") { for (const [k, v] of Object.entries((globalThis as any).__ex ?? {})) console.log("예", k, v); return; }
  console.log(`빠진 원인 글자 종류: ${Object.keys(miss).length}`);
  const top = Object.entries(miss).sort((a, b) => b[1].n - a[1].n);
  let cum = 0;
  top.slice(0, 40).forEach(([k, m], i) => { cum += m.n; console.log(`${i + 1}\t${k}\t${m.hun}\t${m.n}\t${[...m.examples].join(",")}`); });
})();
