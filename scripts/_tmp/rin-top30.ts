import { createClient } from "@supabase/supabase-js";
import { parseNamingParams } from "@/lib/naming/params";
import { runNaming } from "@/lib/naming/service";
import { hunEum } from "@/lib/naming/recommend";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
(async () => {
  const p = parseNamingParams({ surname: "김", sh: "金", date: "2022-02-10", time: "10:30", place: "seoul", gender: "female", len: "any" });
  if (!p.ok) throw p.error;
  const r = await runNaming(supabase, p.value);
  if (!r.ok) throw r.error;
  const y = r.saju.yongsin;
  console.log(`용신 ${y.yongsin} 희신 ${y.huisin} 기신 ${y.gisin} ${y.strength} ${y.method}`);
  console.log("순위\t이름\t한자\t성명학\t등급\t사주\t수리\t발음\t자원\t한자뜻\t어감\t기본순위\t발음오행\t자원오행");
  r.groups.slice(0, 30).forEach((g, i) => {
    const o = g.options[0], a = o.analysis, b = a.breakdown;
    console.log([i + 1, g.hangul, o.givenName.map((c) => `${c.hanja}(${hunEum(c)},${c.element ?? "-"},${c.suitability})`).join(" "),
      a.totalScore.toFixed(1), a.grade, b.saju?.toFixed(0), b.suri?.toFixed(0), b.pronunciation?.toFixed(0), b.resource?.toFixed(0),
      o.meaning.toFixed(2), o.trend.toFixed(3), o.baseScore, a.pronunciation.elements.join(""), a.resource?.elements.join("") ?? "-"].join("\t"));
  });
  const firsts = new Map<string, number>();
  for (const g of r.groups.slice(0, 30)) firsts.set(g.hangul[0], (firsts.get(g.hangul[0]) ?? 0) + 1);
  console.log("첫 글자 분포:", [...firsts].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}${v}`).join(" "));
  console.log("전체 후보", r.groups.length);
})();
