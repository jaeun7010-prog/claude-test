import { createClient } from "@supabase/supabase-js";
import { classifyHanja } from "@/lib/naming/hanja-suitability";
import { hasPositiveMeaning } from "@/lib/naming/hanja-meaning";
import { isAllowedNameHanja } from "@/lib/naming/name-hanja-allowlist";
import { readFileSync } from "fs";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const first = (m: string | null) => (m ?? "").split(/[;,]/, 1)[0];
(async () => {
  const rows: any[] = [];
  for (let f = 0; ; f += 1000) {
    const { data, error } = await supabase.from("hanja_dict").select("hanja, eum, meaning, hun, is_edu").eq("is_name_hanja", true).eq("is_forbidden", false).order("id").range(f, f + 999);
    if (error) throw error; rows.push(...data!); if (data!.length < 1000) break;
  }
  const top = new Set(readFileSync("scripts/_tmp/top-hanja.tsv", "utf8").split("\n").slice(1).map((l) => l.split("\t")[0] + l.split("\t")[1]));
  const ch: Record<string, string[]> = {};
  let pool = 0;
  for (const r of rows) {
    const c = { hanja: r.hanja, eum: r.eum, meaning: r.meaning, hun: r.hun, isEdu: !!r.is_edu };
    const cur = classifyHanja(c);
    if (cur === "exclude") continue; pool++;
    if (isAllowedNameHanja(c.hanja, c.eum) || !(cur === "good" || cur === "normal")) continue;
    if (!hasPositiveMeaning(c.meaning) || hasPositiveMeaning(first(c.meaning))) continue;
    const alt = cur === "good" ? "normal" : c.isEdu ? "normal" : "obscure";
    if (alt === cur) continue;
    const k = `${cur}→${alt}`; (ch[k] ??= []).push(`${c.hanja}${c.eum}(${c.hun ?? ""}: ${first(c.meaning)})${top.has(c.hanja + c.eum) ? "★" : ""}`);
  }
  console.log("후보 풀", pool);
  for (const [k, v] of Object.entries(ch)) { console.log(`\n${k}: ${v.length}자 (★ 표본 상위 30에 나온 글자 ${v.filter((x) => x.endsWith("★")).length})`); console.log(v.filter((x) => x.endsWith("★")).join(" ")); console.log("예:", v.filter((x) => !x.endsWith("★")).slice(0, 25).join(" ")); }
})();
