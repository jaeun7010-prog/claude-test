import { createClient } from "@supabase/supabase-js";
import { classifyHanja } from "@/lib/naming/hanja-suitability";
import { isAllowedNameHanja } from "@/lib/naming/name-hanja-allowlist";
import { readFileSync } from "fs";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
(async () => {
  const rows: any[] = [];
  for (let f = 0; ; f += 1000) { const { data } = await supabase.from("hanja_dict").select("hanja,eum,meaning,hun,is_edu").eq("is_name_hanja", true).eq("is_forbidden", false).order("id").range(f, f + 999); rows.push(...data!); if (data!.length < 1000) break; }
  const top = new Set(readFileSync("scripts/_tmp/top-hanja.tsv", "utf8").split("\n").slice(1).map((l) => l.split("\t")[0] + l.split("\t")[1]));
  const by: Record<string, string[]> = {};
  for (const r of rows) {
    if (r.hun && r.hun.trim()) continue;
    const cur = classifyHanja({ ...r, isEdu: !!r.is_edu });
    if (cur === "exclude" || cur === "obscure") continue;
    const k = isAllowedNameHanja(r.hanja, r.eum) ? "허용 목록" : `${cur}${r.is_edu ? " 교육용" : ""}`;
    (by[k] ??= []).push(`${r.hanja}${r.eum}${top.has(r.hanja + r.eum) ? "★" : ""}(${(r.meaning ?? "").split(/;/)[0].slice(0, 28)})`);
  }
  for (const [k, v] of Object.entries(by)) console.log(`\n[${k}] ${v.length}자\n` + v.join("  "));
})();
