// 훈 채움·이체자·제외 글자 판정 확인
import { createClient } from "@supabase/supabase-js";
import { fetchPool } from "@/lib/naming/hanja-repo";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
(async () => {
  const pool = await fetchPool(s);
  const want = [..."豐妍煕強閏璐瓏烺珹晸冢駘昃匾鼂曬㰔䫻㶼縟䀴沬䏧艷㥥訏絕"];
  for (const h of want) { const r = pool.filter((c) => c.hanja === h); console.log(h, r.length ? r.map((c) => `${c.eum} ${c.hun ?? "-"} ${c.suitability}`).join(", ") : "(후보 풀에 없음 = 제외)"); }
  const g: Record<string, number> = {}; for (const c of pool) g[c.suitability] = (g[c.suitability] ?? 0) + 1; console.log("풀", pool.length, g);
})();
