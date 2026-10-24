/**
 * 성씨 한자 후보 점검 (읽기만): npx tsx --env-file=.env.local scripts/_tmp/surname-candidates.ts
 *  - 입력 폼(SurnameFields)과 같은 조회로 소리마다 몇 개가 나오는지, 그중 어떤 글자가 나오는지
 *  - COMMON_SURNAMES·SURNAME_ELEMENTS 글자가 사전에 그 소리로 있는지
 *  - 저장된 이름(user_naming_history, orders)의 성씨 한자
 */
import { createClient } from "@supabase/supabase-js";
import { COMMON_SURNAMES, SURNAME_ELEMENTS } from "@/lib/naming/surnames";

const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const SOUNDS = ["김", "이", "박", "정", "최", "강", "조", "윤", "장", "한", "신"];

(async () => {
  console.log("## 폼 조회 (eum = 소리, is_name_hanja, 획수순 60개 제한) / 제한 없이 전체");
  for (const s of SOUNDS) {
    const { data } = await anon.from("hanja_dict").select("hanja, hun, stroke_count").eq("eum", s).eq("is_name_hanja", true).order("stroke_count").limit(60);
    const { count } = await anon.from("hanja_dict").select("hanja", { count: "exact", head: true }).eq("eum", s).eq("is_name_hanja", true);
    const rows = data ?? [];
    const def = COMMON_SURNAMES[s];
    const pos = rows.findIndex((r) => r.hanja === def);
    console.log(`${s}\t${rows.length}개 (전체 ${count})\t기본 ${def} ${pos >= 0 ? `${pos + 1}번째` : "목록에 없음"}\t앞 12개: ${rows.slice(0, 12).map((r) => `${r.hanja}(${r.hun ?? "-"})`).join(" ")}`);
  }

  console.log("\n## 표 글자가 사전에 어떤 소리로 있는지");
  const chars = [...new Set([...Object.values(COMMON_SURNAMES).join(""), ...Object.keys(SURNAME_ELEMENTS)])];
  const { data: dict } = await anon.from("hanja_dict").select("hanja, eum, is_name_hanja, hun").in("hanja", chars);
  for (const [sound, h] of Object.entries(COMMON_SURNAMES)) {
    [...h].forEach((c, i) => {
      const e = sound.length === h.length ? sound[i] : sound;
      const rows = (dict ?? []).filter((r) => r.hanja === c);
      const hit = rows.find((r) => r.eum === e);
      if (!hit || !hit.is_name_hanja) console.log(`COMMON ${sound} ${c}: 사전 소리 ${rows.map((r) => `${r.eum}${r.is_name_hanja ? "" : "(인명용 아님)"}`).join(",") || "없음"}`);
    });
  }
  const inCommon = new Set(Object.values(COMMON_SURNAMES).join(""));
  for (const c of Object.keys(SURNAME_ELEMENTS)) {
    if (inCommon.has(c)) continue;
    const rows = (dict ?? []).filter((r) => r.hanja === c);
    console.log(`자원오행 표에만 있음 ${c}: 사전 소리 ${rows.map((r) => `${r.eum}(${r.hun ?? "-"})`).join(", ")}`);
  }

  console.log("\n## 저장된 이름의 성씨 한자");
  const { data: hist, error } = await admin.from("user_naming_history").select("surname, surname_hanja");
  if (error) console.log("조회 실패", error.message);
  const tally = new Map<string, number>();
  for (const r of hist ?? []) tally.set(`${r.surname} ${r.surname_hanja}`, (tally.get(`${r.surname} ${r.surname_hanja}`) ?? 0) + 1);
  console.log(`전체 ${hist?.length ?? 0}건`, [...tally].map(([k, n]) => `${k}${COMMON_SURNAMES[k.split(" ")[0]] === k.split(" ")[1] ? "" : "(기본 아님)"} ${n}`).join(" · "));
  const { data: ord, error: oe } = await admin.from("orders").select("report_snapshot");
  if (oe) console.log("주문 조회 실패", oe.message);
  const ot = new Map<string, number>();
  for (const o of ord ?? []) {
    const s = (o.report_snapshot as { input?: { surname?: string; surnameHanja?: string } } | null)?.input;
    const k = s ? `${s.surname} ${s.surnameHanja}` : "스냅숏 없음/형식 다름";
    ot.set(k, (ot.get(k) ?? 0) + 1);
  }
  console.log(`주문 ${ord?.length ?? 0}건`, [...ot].map(([k, n]) => `${k} ${n}`).join(" · "));
})();
