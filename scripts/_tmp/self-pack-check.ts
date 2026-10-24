/**
 * 셀프 작명 점수표 압축(self-pack.ts) 점검: npx tsx --env-file=.env.local scripts/_tmp/self-pack-check.ts
 * 압축 전후 TOP 3·안내 문장·자리별 정렬([최고]/[추천] 포함)이 같은지, 크기가 얼마나 줄었는지 본다.
 */
import { createClient } from "@supabase/supabase-js";
import { parseNamingParams } from "@/lib/naming/params";
import { runSelfNaming } from "@/lib/naming/self";
import { packSelfTable, unpackSelfTable } from "@/lib/naming/self-pack";
import { rankSlot, selfNotice, topCombos, type SelfTable } from "@/lib/naming/self-rank";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const CASES: [Record<string, string>, string][] = [
  [{ surname: "김", sh: "金", date: "2024-05-10", time: "07:28", place: "seoul", gender: "female" }, "서윤"],
  [{ surname: "이", sh: "李", date: "2024-11-20", time: "09:33", place: "jeju", gender: "male" }, "도윤"],
  [{ surname: "박", sh: "朴", date: "2022-08-08", time: "12:10", place: "seoul", gender: "female" }, "유수"],
  [{ surname: "김", sh: "金", date: "2024-05-10", time: "07:28", place: "seoul", gender: "female" }, "윤"],
  [{ surname: "김", sh: "金", ps: "박", psh: "朴", date: "2024-05-10", time: "07:28", place: "seoul", gender: "female" }, "서윤"],
  [{ surname: "남궁", sh: "南宮", date: "2025-03-03", time: "03:15", place: "seoul", gender: "male" }, "지호"],
];
const sig = (t: SelfTable) =>
  JSON.stringify({
    top: topCombos(t).map((c) => c.picks),
    notice: selfNotice(t),
    slots: t.slots.map((_, s) => [rankSlot(t, s, t.slots.map(() => null)), rankSlot(t, s, t.slots.map(() => 0))].map((r) => r.map((x) => [x.index, x.badge, x.score?.totalScore.toFixed(1), x.score?.grade]))),
  });

(async () => {
  let bad = 0;
  for (const [raw, given] of CASES) {
    const p = parseNamingParams(raw);
    if (!p.ok) throw new Error(p.error);
    const r = await runSelfNaming(supabase, p.value, given);
    if (!r.ok) throw new Error(r.error);
    const packed = packSelfTable(r.table);
    const same = sig(r.table) === sig(unpackSelfTable(packed));
    if (!same) bad++;
    const before = JSON.stringify(r.table).length;
    const after = JSON.stringify(packed).length;
    console.log(`${raw.surname}${raw.ps ?? ""}${given}\t조합 ${r.table.scores.length}\t${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB (${((after / before) * 100).toFixed(0)}%)\t${same ? "같음" : "다름!"}\t${selfNotice(r.table)?.text}`);
  }
  console.log(bad ? `다름 ${bad}건` : "모두 같음");
})();
