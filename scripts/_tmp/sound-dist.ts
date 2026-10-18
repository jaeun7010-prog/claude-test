import { createClient } from "@supabase/supabase-js";
import { parseNamingParams } from "@/lib/naming/params";
import { runNaming } from "@/lib/naming/service";
import { soundFirst, show } from "./sound-first";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const SURNAMES: [string, string][] = [["김", "金"], ["이", "李"], ["박", "朴"], ["최", "崔"], ["정", "鄭"]];
const BIRTHS = [["2024-11-20","09:33","jeju"],["2024-11-20","09:33","seoul"],["2024-05-10","07:28","seoul"],["2023-01-05","23:25","seoul"],["1987-07-15","14:20","seoul"],["2022-08-08","12:10","seoul"],["2025-12-24","18:50","seoul"],["2024-09-02","06:58","seoul"],["2025-03-03","03:15","seoul"],["2025-07-21","16:40","seoul"]];
(async () => {
  for (const gender of ["female", "male"]) {
    const g0 = { S: 0, A: 0, B: 0, C: 0 }, g1 = { S: 0, A: 0, B: 0, C: 0 }; let short0 = 0, short1 = 0, min1 = 99, sum1 = 0, overlap = 0;
    for (const [s, sh] of SURNAMES) for (const [date, time, place] of BIRTHS) {
      const p = parseNamingParams({ surname: s, sh, date, time, place, gender }); if (!p.ok) throw p.error;
      const cur = await runNaming(supabase, p.value); if (!cur.ok) throw cur.error;
      const a = show(cur.groups), b = show((await soundFirst(p.value)).groups);
      for (const x of a) g0[x.options[0].analysis.grade]++; for (const x of b) g1[x.options[0].analysis.grade]++;
      if (a.length < 30) short0++; if (b.length < 30) short1++; min1 = Math.min(min1, b.length); sum1 += b.length;
      overlap += b.filter((x) => a.some((y) => y.hangul === x.hangul)).length;
    }
    console.log(`${gender}: 지금 S${g0.S} A${g0.A} B${g0.B} C${g0.C} (30개 미만 ${short0}건) | 소리 먼저 S${g1.S} A${g1.A} B${g1.B} C${g1.C} (30개 미만 ${short1}건, 최소 ${min1}개, 평균 ${(sum1 / 50).toFixed(1)}개) | 겹치는 이름 ${(overlap / 50).toFixed(1)}개/30`);
  }
})();
