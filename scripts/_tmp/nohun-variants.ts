// 훈 없는 글자(애매로 내려간 글자) 목록 + Unihan 이체자 관계. 사용: nohun-variants.ts <Unihan_Variants.txt>
import { createClient } from "@supabase/supabase-js";
import { classifyHanja } from "@/lib/naming/hanja-suitability";
import { isAllowedNameHanja } from "@/lib/naming/name-hanja-allowlist";
import { readFileSync, existsSync } from "fs";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const cp = (u: string) => String.fromCodePoint(parseInt(u.replace("U+", "").split("<")[0], 16));
const vars = new Map<string, string[]>();
for (const l of readFileSync(process.argv[2], "utf8").split("\n")) {
  if (!l.startsWith("U+")) continue;
  const [c, k, v] = l.split("\t");
  if (!/kZVariant|kSemanticVariant|kSpecializedSemanticVariant|kCompatibilityVariant|kTraditionalVariant|kSpoofingVariant/.test(k)) continue;
  const ch = cp(c);
  for (const t of v.trim().split(/\s+/)) (vars.get(ch) ?? vars.set(ch, []).get(ch)!).push(`${k.replace("Variant", "").replace("k", "")}:${cp(t)}`);
}
(async () => {
  const rows: any[] = [];
  for (let f = 0; ; f += 1000) { const { data } = await supabase.from("hanja_dict").select("hanja,eum,meaning,hun,is_edu,stroke_count,element").eq("is_name_hanja", true).eq("is_forbidden", false).order("id").range(f, f + 999); rows.push(...data!); if (data!.length < 1000) break; }
  const byHanja = new Map<string, any[]>();
  for (const r of rows) (byHanja.get(r.hanja) ?? byHanja.set(r.hanja, []).get(r.hanja)!).push(r);
  const top = existsSync("scripts/_tmp/top-hanja.tsv") ? new Set(readFileSync("scripts/_tmp/top-hanja.tsv", "utf8").split("\n").slice(1).map((l) => l.split("\t")[0])) : new Set();
  let n = 0;
  for (const r of rows) {
    if (r.hun && r.hun.trim()) continue;
    if (isAllowedNameHanja(r.hanja, r.eum)) continue;
    const now = classifyHanja({ ...r, isEdu: !!r.is_edu });
    if (now !== "obscure") continue;
    const ifHun = classifyHanja({ ...r, hun: undefined, isEdu: !!r.is_edu });
    const v = (vars.get(r.hanja) ?? []).map((s) => { const t = [...s].pop()!; const d = byHanja.get(t)?.find((x) => x.eum === r.eum) ?? byHanja.get(t)?.[0]; return `${s}${d ? `(${d.eum}/${d.hun ?? "-"})` : "(사전없음)"}`; });
    n++;
    console.log([r.hanja, r.eum, r.is_edu ? "교육" : "", ifHun, r.stroke_count, r.element ?? "-", top.has(r.hanja) ? "★" : "", (r.meaning ?? "").slice(0, 50), v.join(" ")].join("\t"));
  }
  console.error("총", n);
})();
