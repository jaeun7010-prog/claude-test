import { createClient } from "@supabase/supabase-js";
import { classifyHanja } from "@/lib/naming/hanja-suitability";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
(async () => { const { data } = await s.from("hanja_dict").select("hanja,eum,hun,meaning,is_edu,element,stroke_count").in("hanja", process.argv.slice(2));
  for (const r of data!) console.log(r.hanja, r.eum, r.hun, "|", r.meaning, "| edu", r.is_edu, r.element, r.stroke_count, classifyHanja({ ...r, isEdu: !!r.is_edu })); })();
