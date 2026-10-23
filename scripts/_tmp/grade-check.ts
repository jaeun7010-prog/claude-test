// 글자별 뜻 등급·화면 훈 확인: npx tsx --env-file=.env.local scripts/_tmp/grade-check.ts 岷琇瑩律債
import { createClient } from "@supabase/supabase-js";
import { fetchPool } from "@/lib/naming/hanja-repo";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
(async () => {
  const pool = await fetchPool(s);
  for (const h of [...(process.argv[2] ?? "")]) {
    const r = pool.filter((c) => c.hanja === h);
    console.log(h, r.length ? r.map((c) => `${c.hun ?? "-"} ${c.eum} · ${c.suitability}`).join(", ") : "(후보 풀에 없음 = 제외)");
  }
})();
