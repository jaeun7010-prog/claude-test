/**
 * 복성·부모 성 함께 쓰기 점검: npx tsx --env-file=.env.local scripts/compare-surnames.ts
 * 사례마다 추천 상위 10개(기본 순위 점수 순 = 우선순위 모두 보통일 때의 화면 순서)의
 * 등급·점수·4격·발음오행·자원오행을 표로 출력한다. 부모 성 함께 쓰기는 조합 진단과 법적 이름 전체 기준 점수도 함께 낸다.
 * 인자 `parent`를 주면 부모 성 함께 쓰기 사례만 돌린다.
 */
import { createClient } from "@supabase/supabase-js";
import { parseNamingParams } from "@/lib/naming/params";
import { runNaming } from "@/lib/naming/service";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });

const ONLY = process.argv[2]; // 예: "parent" 이면 부모 성 함께 쓰기 사례만
const ALL_CASES: { label: string; surname: string; sh: string; ps?: string; psh?: string }[] = [
  { label: "남궁", surname: "남궁", sh: "南宮" },
  { label: "제갈", surname: "제갈", sh: "諸葛" },
  { label: "황보", surname: "황보", sh: "皇甫" },
  { label: "선우", surname: "선우", sh: "鮮于" },
  { label: "독고", surname: "독고", sh: "獨孤" },
  { label: "김+박", surname: "김", sh: "金", ps: "박", psh: "朴" },
  { label: "이+남궁", surname: "이", sh: "李", ps: "남궁", psh: "南宮" },
];
const CASES = ONLY === "parent" ? ALL_CASES.filter((c) => c.ps) : ALL_CASES;
const BIRTHS = [
  ["2024-11-20", "09:33", "seoul"],
  ["2025-03-03", "03:15", "seoul"],
];
const GYEOK = ["won", "hyeong", "i", "jeong"] as const;

(async () => {
  for (const [date, time, place] of BIRTHS) {
    for (const c of CASES) {
      const p = parseNamingParams({ surname: c.surname, sh: c.sh, ps: c.ps, psh: c.psh, date, time, place });
      if (!p.ok) throw new Error(p.error);
      const r = await runNaming(supabase, p.value);
      if (!r.ok) throw new Error(r.error);
      const y = r.saju.yongsin;
      const grades = { S: 0, A: 0, B: 0, C: 0 };
      for (const g of r.groups.slice(0, 30)) grades[g.options[0].analysis.grade]++;
      console.log(
        `\n### ${c.label} · ${date} ${time} ${place} · 용신 ${y.yongsin} 희신 ${y.huisin} · 상위 30개 S${grades.S} A${grades.A} B${grades.B} C${grades.C}`
      );
      const legalCol = r.prefix.length > 0;
      for (const x of r.combination ?? []) console.log(`- [${x.tone === "weak" ? "약점" : "좋음"}] ${x.text}`);
      console.log(`| # | 이름 | 한자 | 등급 | 점수 | 원/형/이/정 | 발음오행 | 자원오행 |${legalCol ? " 법적 전체 등급·점수 | 법적 원/형/이/정 |" : ""}`);
      console.log(`|---|---|---|---|---|---|---|---|${legalCol ? "---|---|" : ""}`);
      r.groups.slice(0, 10).forEach((g, i) => {
        const o = g.options[0];
        const a = o.analysis;
        const gy = GYEOK.map((k) => `${a.fourGyeok[k].suri}${a.fourGyeok[k].lucky ? "" : "흉"}`).join("/");
        const res = a.resource
          ? `${a.resource.elements.join("")} ${a.resource.score}${a.resource.arrangement ? ` (${a.resource.arrangement})` : ""}`
          : "-";
        const l = o.legalAnalysis;
        const legal = l
          ? ` ${l.grade} ${l.totalScore} | ${GYEOK.map((k) => `${l.fourGyeok[k].suri}${l.fourGyeok[k].lucky ? "" : "흉"}`).join("/")} |`
          : "";
        console.log(
          `| ${i + 1} | ${c.surname}${g.hangul} | ${c.sh}${o.givenName.map((x) => x.hanja).join("")} | ${a.grade} | ${a.totalScore} | ${gy} | ${a.pronunciation.elements.join("")} ${a.pronunciation.score} | ${res} |${legal}`
        );
      });
    }
  }
})();
