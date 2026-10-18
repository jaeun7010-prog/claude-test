import { createClient } from "@supabase/supabase-js";
import { parseNamingParams, type NamingParams } from "@/lib/naming/params";
import { runNaming, prepare, DISPLAY_LIMIT } from "@/lib/naming/service";
import { fetchPool } from "@/lib/naming/hanja-repo";
import { applyGender } from "@/lib/naming/gender-hanja";
import { recommendNames, type NameGroup, type NameHanja } from "@/lib/naming/recommend";
import { compareAnalysis } from "@/lib/naming/score";
import { rankByPriorities, firstSoundKey, DEFAULT_PRIORITIES } from "@/lib/naming/priorities";
import { buildSounds } from "./name-sounds-draft";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const SOUNDS = buildSounds();
let RAW: NameHanja[] | null = null;

const sortGroups = (gs: NameGroup[]) => gs.sort((a, b) => b.options[0].baseScore - a.options[0].baseScore || compareAnalysis(a.options[0].analysis, b.options[0].analysis) || a.hangul.localeCompare(b.hangul, "ko"));

/** 소리 먼저: 성별에 맞는 소리 목록 → 그 소리의 한자 조합만 평가 (점수 계산은 지금과 같음) */
export async function soundFirst(p: NamingParams) {
  const base = (await prepare(supabase, p))!;
  RAW ??= await fetchPool(supabase);
  const pool = applyGender(RAW.filter((c) => c.suitability !== "obscure"), p.gender);
  const byEum = new Map<string, NameHanja[]>();
  for (const c of pool) (byEum.get(c.eum) ?? byEum.set(c.eum, []).get(c.eum)!).push(c);
  const allowed = SOUNDS.filter((s) => p.gender === "neutral" || s.gender === "both" || s.gender === p.gender)
    .filter((s) => (p.length === "1" ? [...s.sound].length === 1 : p.length === "2" ? [...s.sound].length === 2 : true));
  const { yongsin: needed, huisin, gisin } = base.saju.yongsin;
  const run = (minLucky: number) => {
    const out: NameGroup[] = [];
    for (const { sound } of allowed) {
      const sy = [...sound];
      const opts = { surname: base.surname, prefix: base.prefix, neededElement: needed, favorableElement: huisin, unfavorableElement: gisin, requireNeeded: true, minLuckyGyeok: minLucky, minTrend: 0, limit: 1 };
      const g = sy.length === 1
        ? recommendNames({ ...opts, first: [], second: [], single: byEum.get(sy[0]) ?? [] })
        : recommendNames({ ...opts, first: byEum.get(sy[0]) ?? [], second: byEum.get(sy[1]) ?? [], single: [] });
      out.push(...g);
    }
    return sortGroups(out);
  };
  let gs = run(4);
  if (gs.length < 10) gs = run(3);
  return { groups: gs.slice(0, 60), soundCount: allowed.length };
}

export const show = (gs: NameGroup[]) => {
  const items = gs.map((x) => ({ x, metrics: { baseScore: x.options[0].baseScore, globalScore: 0, births: null, everListed: null } }));
  return rankByPriorities(items, DEFAULT_PRIORITIES, false, DISPLAY_LIMIT, undefined, (i) => firstSoundKey([...i.x.hangul][0])).map(({ item }) => item.x);
};

if (require.main === module) (async () => {
  const counts = { female: 0, male: 0, both: 0 } as Record<string, number>;
  for (const s of SOUNDS) counts[s.gender]++;
  console.log("소리 목록:", counts, "합계", SOUNDS.length);
  for (const g of ["female", "male", "both"]) console.log(`${g} 예시:`, SOUNDS.filter((s) => s.gender === g).slice(0, 30).map((s) => s.sound).join(" "));
  for (const [sn, sh] of [["김", "金"], ["이", "李"], ["박", "朴"]]) for (const gender of ["female", "male"]) {
    const p = parseNamingParams({ surname: sn, sh, date: "2022-02-10", time: "10:30", place: "seoul", gender, len: "any" }); if (!p.ok) throw p.error;
    const cur = await runNaming(supabase, p.value); if (!cur.ok) throw cur.error;
    const a = show(cur.groups), b = show((await soundFirst(p.value)).groups);
    const fmt = (g: NameGroup | undefined) => g ? `${g.hangul} ${g.options[0].givenName.map((c) => c.hanja).join("")} ${g.options[0].analysis.grade}${g.options[0].analysis.totalScore.toFixed(1)}` : "-";
    console.log(`\n### ${sn}씨 ${gender === "female" ? "여자아이" : "남자아이"} (지금 ${a.length}개 / 소리 먼저 ${b.length}개)`);
    console.log("순위\t지금\t소리 먼저");
    for (let i = 0; i < 15; i++) console.log(`${i + 1}\t${fmt(a[i])}\t${fmt(b[i])}`);
  }
})();
