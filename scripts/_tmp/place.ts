import { createClient } from "@supabase/supabase-js";
import { classifyHanja } from "@/lib/naming/hanja-suitability";
import { isAllowedNameHanja } from "@/lib/naming/name-hanja-allowlist";
import { readFileSync } from "fs";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const PLACE = /\b(river|stream|mountain|mountains|lake|sea|county|province|prefecture|district)\b.*\b(in|of)\b.*\b([A-Z][a-z]+)|\bname of (a|the)? ?(river|mountain|lake|sea|place|state|county)|\b(river|mountain|lake) in\b/;
const first = (m: string | null) => (m ?? "").split(/;/, 1)[0];
(async () => {
  const rows: any[] = [];
  for (let f = 0; ; f += 1000) { const { data } = await supabase.from("hanja_dict").select("hanja,eum,meaning,hun,is_edu").eq("is_name_hanja", true).eq("is_forbidden", false).order("id").range(f, f + 999); rows.push(...data!); if (data!.length < 1000) break; }
  const top = new Set(readFileSync("scripts/_tmp/top-hanja.tsv", "utf8").split("\n").slice(1).map((l) => l.split("\t")[0] + l.split("\t")[1]));
  const by: Record<string, string[]> = {};
  for (const r of rows) {
    const cur = classifyHanja({ ...r, isEdu: !!r.is_edu }); if (cur === "exclude" || cur === "obscure") continue;
    if (!PLACE.test(first(r.meaning))) continue;
    const allow = isAllowedNameHanja(r.hanja, r.eum);
    (by[allow ? "허용 목록" : cur] ??= []).push(`${r.hanja}${r.eum}(${r.hun ?? "훈 없음"}: ${first(r.meaning).slice(0, 40)})${top.has(r.hanja + r.eum) ? "★" : ""}`);
  }
  for (const [k, v] of Object.entries(by)) console.log(`\n[${k}] ${v.length}자\n` + v.join("\n"));
})();
