/**
 * 성씨 자원오행 표를 늘릴 때 등급 영향: npx tsx --env-file=.env.local scripts/_tmp/surname-elem-grades.ts
 * 새로 넣는 성씨(아래 NEW) × 테스트 사주 10개(grade-distribution.ts와 같음) × 남·여, 화면 순서 상위 30 등급 분포.
 * 표를 넣기 전후로 한 번씩 돌려 비교한다.
 */
import { createClient } from "@supabase/supabase-js";
import { parseNamingParams } from "@/lib/naming/params";
import { DEFAULT_PRIORITIES, firstSoundKey, rankByPriorities } from "@/lib/naming/priorities";
import { DISPLAY_LIMIT, runNaming } from "@/lib/naming/service";
import { surnameOptions } from "@/lib/naming/surname-hanja";
import { SURNAME_TABLE } from "@/lib/naming/surname-table";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const NEW = "康玄咸卞廉楊邊呂秋魯都蘇愼石宣薛馬吉周延房魏表明奇潘王琴玉陸印孟牟蔣卓鞠余秦魚殷片丘龍庾芮慶奉程昔史夫鴌";
const BIRTHS = [
  ["2024-11-20", "09:33", "jeju"], ["2024-11-20", "09:33", "seoul"], ["2024-05-10", "07:28", "seoul"],
  ["2023-01-05", "23:25", "seoul"], ["1987-07-15", "14:20", "seoul"], ["2022-08-08", "12:10", "seoul"],
  ["2025-12-24", "18:50", "seoul"], ["2024-09-02", "06:58", "seoul"], ["2025-03-03", "03:15", "seoul"],
  ["2025-07-21", "16:40", "seoul"],
];
// 한자 → 대표 소리 (표에서 그 한자가 나오는 소리 묶음)
const soundOf = (h: string) => Object.keys(SURNAME_TABLE).find((k) => surnameOptions(k).some((o) => o.hanja === h));

(async () => {
  const out: Record<string, Record<string, number>> = { male: { S: 0, A: 0, B: 0, C: 0 }, female: { S: 0, A: 0, B: 0, C: 0 } };
  for (const h of NEW) {
    const sound = soundOf(h);
    if (!sound) { console.log(`${h}: 성씨 표에 없음`); continue; }
    for (const g of ["male", "female"] as const)
      for (const [date, time, place] of BIRTHS) {
        const p = parseNamingParams({ surname: sound, sh: h, date, time, place, gender: g });
        if (!p.ok) throw new Error(p.error);
        const r = await runNaming(sb, p.value);
        if (!r.ok) { console.log(h, r.error); continue; }
        const items = r.groups.map((x) => ({ x, metrics: { baseScore: x.options[0].baseScore, globalScore: x.options[0].globalScore, births: null, everListed: null } }));
        const ranked = rankByPriorities(items, DEFAULT_PRIORITIES, false, DISPLAY_LIMIT, (it) => !!it.x.soundFill, (it) => firstSoundKey(it.x.hangul[0]));
        for (const { item } of ranked) out[g][item.x.options[0].analysis.grade]++;
      }
  }
  for (const g of ["male", "female"]) console.log(`${g === "male" ? "남" : "여"} S${out[g].S} A${out[g].A} B${out[g].B} C${out[g].C}`);
})();
