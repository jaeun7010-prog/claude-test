/**
 * 한자 제외 전후 영향: npx tsx --env-file=.env.local scripts/_tmp/hanja-exclude-trial.ts <글자>
 * 단성 56개 × 남·여 × 테스트 사주 10개의 화면 상위 30 등급 분포와 그 글자가 든 이름(대표 한자 기준)을 센다.
 */
import { createClient } from "@supabase/supabase-js";
import { parseNamingParams } from "@/lib/naming/params";
import { DISPLAY_LIMIT, runNaming } from "@/lib/naming/service";
import { rankByPriorities, firstSoundKey, DEFAULT_PRIORITIES } from "@/lib/naming/priorities";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const CH = process.argv[2] ?? "爐";
const BIRTHS = [
  ["2024-11-20", "09:33", "jeju"], ["2024-11-20", "09:33", "seoul"], ["2024-05-10", "07:28", "seoul"],
  ["2023-01-05", "23:25", "seoul"], ["1987-07-15", "14:20", "seoul"], ["2022-08-08", "12:10", "seoul"],
  ["2025-12-24", "18:50", "seoul"], ["2024-09-02", "06:58", "seoul"], ["2025-03-03", "03:15", "seoul"],
  ["2025-07-21", "16:40", "seoul"],
];
const SINGLE = "김金 이李 박朴 최崔 정鄭 강姜 조趙 윤尹 장張 임林 한韓 오吳 서徐 신申 권權 황黃 안安 송宋 전全 홍洪 유柳 고高 문文 양梁 손孫 배裵 조曺 백白 허許 유劉 남南 심沈 노盧 정丁 하河 곽郭 성成 차車 주朱 우禹 구具 신辛 임任 전田 민閔 유兪 나羅 진陳 지池 엄嚴 채蔡 원元 천千 방方 공孔";
const list = SINGLE.split(" ").map((x) => [x.slice(0, 1), x.slice(1)] as const);
(async () => {
  const total: Record<string, Record<string, number>> = { male: { S: 0, A: 0, B: 0, C: 0 }, female: { S: 0, A: 0, B: 0, C: 0 } };
  const hits: string[] = [];
  for (const [s, sh] of list) for (const g of ["male", "female"]) for (const [date, time, place] of BIRTHS) {
    const p = parseNamingParams({ surname: s, sh, date, time, place, gender: g });
    if (!p.ok) throw p.error;
    const r = await runNaming(supabase, p.value);
    if (!r.ok) throw new Error(r.error);
    const items = r.groups.map((x) => ({ x, metrics: { baseScore: x.options[0].baseScore, globalScore: 0, births: null, everListed: null } }));
    const shown = rankByPriorities(items, DEFAULT_PRIORITIES, false, DISPLAY_LIMIT, undefined, (i) => firstSoundKey([...i.x.hangul][0]));
    shown.slice(0, DISPLAY_LIMIT).forEach(({ item }, i) => {
      const o = item.x.options[0];
      total[g][o.analysis.grade]++;
      const hz = o.givenName.map((h) => h.hanja).join("");
      if (hz.includes(CH)) hits.push(`${s}${item.x.hangul}(${hz}) ${o.analysis.grade} ${o.analysis.totalScore} ${g} ${date} ${place} ${i + 1}위`);
    });
  }
  for (const h of hits) console.log(h);
  console.log(`HITS ${hits.length}`);
  for (const g of ["male", "female"]) { const t = total[g]; console.log(`${g} S${t.S} A${t.A} B${t.B} C${t.C}`); }
})();
