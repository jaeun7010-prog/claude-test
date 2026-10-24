import { createClient } from "@supabase/supabase-js";
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
(async () => {
  for (const [s, cs] of [["정", "鄭丁程"], ["조", "趙曺曹"], ["이", "李異伊"], ["강", "姜康江"], ["장", "張章蔣莊"], ["한", "韓"], ["윤", "尹"], ["신", "申辛愼"]] as const) {
    const { data } = await anon.from("hanja_dict").select("hanja, stroke_count, is_forbidden").eq("eum", s).eq("is_name_hanja", true).order("stroke_count");
    console.log(s, [...cs].map((c) => { const i = (data ?? []).findIndex((r) => r.hanja === c); return `${c} ${i < 0 ? "없음" : `${i + 1}번째${i >= 60 ? "(60개 밖)" : ""}`}`; }).join(" · "));
  }
  const { data } = await admin.from("orders").select("report_snapshot, status");
  for (const o of data ?? []) { const r = o.report_snapshot as Record<string, any> | null; console.log(o.status, r ? JSON.stringify(r).match(/"surname(Hanja)?":"[^"]*"/g)?.slice(0, 2) : "스냅숏 없음"); }
})();
