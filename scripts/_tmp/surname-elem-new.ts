import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const C = "康玄咸卞廉楊邊呂秋魯都蘇愼石宣薛馬吉周延房魏表明奇潘王琴玉陸印孟牟蔣卓鞠余秦魚殷片丘龍庾芮慶奉程昔史夫";
(async () => {
  const { data } = await sb.from("hanja_dict").select("hanja, eum, radical, element, hun, stroke_count").in("hanja", [...C]);
  for (const c of C) { const r = (data ?? []).filter((x) => x.hanja === c); console.log(c, r.map((x) => `${x.eum} 부수${x.radical ?? "-"} 오행${x.element ?? "-"} ${x.hun ?? ""} ${x.stroke_count}획`).join(" | ")); }
  const { data: q } = await sb.from("hanja_dict").select("hanja, eum, radical, element, hun").eq("hanja", "鴌");
  console.log("鴌", q);
})();
