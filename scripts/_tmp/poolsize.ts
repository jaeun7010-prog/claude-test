import { createClient } from "@supabase/supabase-js";
import { fetchPool } from "@/lib/naming/hanja-repo";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
(async () => { const p = await fetchPool(s); const c: Record<string, number> = {}; for (const x of p) c[x.suitability] = (c[x.suitability] ?? 0) + 1; console.log("pool", p.length, c); })();
