/**
 * 단성 결과 회귀 점검: npx tsx --env-file=.env.local scripts/dump-single-surname.ts > before.txt
 * 성씨 5개 × 테스트 사주 10개(grade-distribution.ts와 같음)의 후보 전체(CANDIDATE_LIMIT)를
 * 한자 조합·점수·4격·발음오행까지 한 줄씩 출력한다. 엔진을 바꾼 뒤 전후 출력을 diff로 비교한다.
 */
import { createClient } from "@supabase/supabase-js";
import { parseNamingParams } from "@/lib/naming/params";
import { runNaming } from "@/lib/naming/service";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const SURNAMES: [string, string][] = [["김", "金"], ["이", "李"], ["박", "朴"], ["최", "崔"], ["정", "鄭"]];
const BIRTHS = [
  ["2024-11-20", "09:33", "jeju"], ["2024-11-20", "09:33", "seoul"], ["2024-05-10", "07:28", "seoul"],
  ["2023-01-05", "23:25", "seoul"], ["1987-07-15", "14:20", "seoul"], ["2022-08-08", "12:10", "seoul"],
  ["2025-12-24", "18:50", "seoul"], ["2024-09-02", "06:58", "seoul"], ["2025-03-03", "03:15", "seoul"],
  ["2025-07-21", "16:40", "seoul"],
];
(async () => {
  for (const [s, sh] of SURNAMES) for (const [date, time, place] of BIRTHS) {
    const p = parseNamingParams({ surname: s, sh, date, time, place });
    if (!p.ok) throw p.error;
    const r = await runNaming(supabase, p.value);
    if (!r.ok) throw r.error;
    console.log(`## ${s}(${sh}) ${date} ${time} ${place}`);
    for (const g of r.groups) {
      for (const o of g.options) {
        const a = o.analysis;
        const gy = (["won", "hyeong", "i", "jeong"] as const).map((k) => a.fourGyeok[k].suri).join("/");
        console.log(
          [g.hangul, o.givenName.map((c) => c.hanja).join(""), a.totalScore, a.grade, o.baseScore,
            JSON.stringify(a.breakdown), gy, a.pronunciation.elements.join(""),
            a.resource?.arrangement ?? "-", o.globalScore, o.trend.toFixed(4), o.meaning].join("\t")
        );
      }
    }
  }
})();
