/**
 * 순우리말 쓰임 가점 전후 비교: npx tsx scripts/_tmp/native-usage-compare.ts <출력.json> [이전.json]
 * 김·이·박 × 여/남 × 목/금, 글자 수 상관없음, 서비스 코드(buildNativeCandidates)의 상위 10.
 * 이전 결과 파일을 주면 나란히 표로 출력한다.
 */
import { readFileSync, writeFileSync } from "node:fs";

import { buildNativeCandidates } from "@/lib/naming/native/service";
import { parseNamingParams } from "@/lib/naming/params";
import type { Element } from "@/lib/naming/types";

const SAJU: Record<string, { yongsin: Element; huisin: Element; gisin: Element }> = {
  목: { yongsin: "목", huisin: "수", gisin: "금" },
  금: { yongsin: "금", huisin: "토", gisin: "화" },
};
const SURNAME_HANJA: Record<string, string> = { 김: "金", 이: "李", 박: "朴" };
const [out, prev] = process.argv.slice(2);

const result: Record<string, string[]> = {};
for (const surname of ["김", "이", "박"])
  for (const g of ["female", "male"] as const)
    for (const el of ["목", "금"]) {
      const qs = `surname=${surname}&sh=${SURNAME_HANJA[surname]}&date=2022-02-10&time=10:30&gender=${g}&place=seoul`;
      const parsed = parseNamingParams(Object.fromEntries(new URLSearchParams(qs)));
      if (!parsed.ok) throw new Error(parsed.error);
      // 용신만 바꿔 넣는다 (점수는 yongsin·huisin·gisin만 본다)
      const saju = { yongsin: SAJU[el] } as unknown as Parameters<typeof buildNativeCandidates>[1];
      const r = buildNativeCandidates(parsed.value, saju, null);
      result[`${surname} ${g === "female" ? "여" : "남"} ${el}`] = r.candidates
        .slice(0, 10)
        .map((c) => `${c.name.name} ${Math.round(c.score.total)}${c.usage === "rare" ? "*" : ""}`);
    }
writeFileSync(out, JSON.stringify(result, null, 1));

if (prev) {
  const before = JSON.parse(readFileSync(prev, "utf8")) as Record<string, string[]>;
  for (const [k, after] of Object.entries(result)) {
    console.log(`\n### ${k}\n| 순위 | 지금 | 적용 후 |\n|---|---|---|`);
    after.forEach((a, i) => console.log(`| ${i + 1} | ${before[k][i]} | ${a} |`));
  }
}
