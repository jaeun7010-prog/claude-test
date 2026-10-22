// 소리 먼저 규칙: 외자·돌림자·부모 성·남녀 공용에서 화면 이름 수 확인
import { createClient } from "@supabase/supabase-js";
import { parseNamingParams } from "@/lib/naming/params";
import { runNaming, DISPLAY_LIMIT } from "@/lib/naming/service";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const base = { surname: "김", sh: "金", date: "2022-02-10", time: "10:30", place: "seoul" };
const cases: [string, Record<string, string>][] = [
  ["외자 여", { gender: "female", len: "1" }], ["외자 남", { gender: "male", len: "1" }],
  ["돌림자 현(끝) 남", { gender: "male", dol: "현", dolpos: "2" }], ["돌림자 규(첫) 남", { gender: "male", dol: "규", dolpos: "1" }],
  ["돌림자 옥(끝) 여", { gender: "female", dol: "옥", dolpos: "2" }],
  ["부모 성 박 여", { gender: "female", ps: "박", psh: "朴" }], ["남녀 공용", { gender: "neutral", neutral: "1" }], ["성별 무관", {}],
];
(async () => {
  for (const [name, extra] of cases) {
    const p = parseNamingParams({ ...base, ...extra }); if (!p.ok) { console.log(name, "파라미터 오류", p.error); continue; }
    const r = await runNaming(s, p.value); if (!r.ok) { console.log(name, r.error); continue; }
    console.log(`${name}: ${r.groups.length}개 (화면 ${Math.min(DISPLAY_LIMIT, r.groups.length)}) ${r.notice ?? ""} | ${r.groups.slice(0, 8).map((g) => g.hangul + g.options[0].analysis.grade).join(" ")}`);
  }
})();
