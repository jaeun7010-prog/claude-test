// 훈이 깨진 글자 찾기 (陶 "질 그" + 도 → "질 그도"). 마지막 낱말이 한 음절이고 받침 ㄹ·ㄴ(관형형)이 아닌 훈을 뽑는다.
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
(async () => {
  const rows: { hanja: string; eum: string; hun: string | null; is_forbidden: boolean }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("hanja_dict").select("hanja, eum, hun, is_forbidden").range(from, from + 999);
    if (error) throw error; rows.push(...(data as any)); if (data!.length < 1000) break;
  }
  const jong = (s: string) => (s.charCodeAt(0) - 0xac00) % 28;
  const out: Record<string, string[]> = {};
  for (const r of rows) {
    if (!r.hun || r.is_forbidden) continue;
    const words = r.hun.trim().split(/\s+/);
    const last = words[words.length - 1];
    if (words.length < 2 || last.length !== 1) continue;
    if ([8, 4].includes(jong(last))) continue; // ㄹ·ㄴ 받침 (관형형)
    (out[last] ??= []).push(`${r.hanja}(${r.hun} ${r.eum})`);
  }
  console.log("--- 훈 끝이 음과 같은 글자");
  for (const r of rows) if (r.hun && !r.is_forbidden && r.hun.trim().endsWith(r.eum)) console.log(`${r.hanja}	${r.hun}	${r.eum}`);
  console.log("--- 한 음절 끝말");
  for (const [k, v] of Object.entries(out).sort((a, b) => b[1].length - a[1].length)) console.log(k, v.length, v.slice(0, 12).join(" "));
})();
