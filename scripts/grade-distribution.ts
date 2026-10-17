/**
 * 등급 분포 점검: npx tsx --env-file=.env.local scripts/grade-distribution.ts
 * 성씨 5개 × 테스트 사주 10개의 추천 상위 DISPLAY_LIMIT개 등급(S/A/B/C)과 통관 배치 수.
 * 사주 엔진·점수 규칙을 바꾼 뒤 git stash로 전후를 각각 돌려 비교한다.
 */
import { createClient } from "@supabase/supabase-js";
import { parseNamingParams } from "@/lib/naming/params";
import { DISPLAY_LIMIT, runNaming } from "@/lib/naming/service";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const SURNAMES: [string, string][] = [["김", "金"], ["이", "李"], ["박", "朴"], ["최", "崔"], ["정", "鄭"]];
const BIRTHS = [
  ["2024-11-20", "09:33", "jeju"], ["2024-11-20", "09:33", "seoul"], ["2024-05-10", "07:28", "seoul"],
  ["2023-01-05", "23:25", "seoul"], ["1987-07-15", "14:20", "seoul"], ["2022-08-08", "12:10", "seoul"],
  ["2025-12-24", "18:50", "seoul"], ["2024-09-02", "06:58", "seoul"], ["2025-03-03", "03:15", "seoul"],
  ["2025-07-21", "16:40", "seoul"],
];
(async () => {
  const total: Record<string, number> = { S: 0, A: 0, B: 0, C: 0 };
  const lines: string[] = [];
  for (const [s, sh] of SURNAMES) for (const [date, time, place] of BIRTHS) {
    const p = parseNamingParams({ surname: s, sh, date, time, place });
    if (!p.ok) throw p.error;
    const r = await runNaming(supabase, p.value);
    if (!r.ok) throw r.error;
    const c: Record<string, number> = { S: 0, A: 0, B: 0, C: 0 };
    let tg = 0;
    for (const g of r.groups.slice(0, DISPLAY_LIMIT)) {
      const a = g.options[0].analysis;
      c[a.grade]++; total[a.grade]++;
      if ((a.resource as { tonggwan?: boolean } | null)?.tonggwan) tg++;
    }
    lines.push(`${s}(${sh}) ${date} ${time} ${place} 용신${r.saju.yongsin.yongsin}\tS${c.S} A${c.A} B${c.B} C${c.C}\t통관${tg}`);
  }
  console.log(lines.join("\n"));
  console.log(`TOTAL S${total.S} A${total.A} B${total.B} C${total.C}`);
})();
