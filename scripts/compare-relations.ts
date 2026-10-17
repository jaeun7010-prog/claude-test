/**
 * 2단계(합·충·형) 전후 용신 비교: npx tsx scripts/compare-relations.ts
 * 보강 전 = 합·충·형을 반영하지 않은 세력(deriveYongsin의 ignoreRelations)
 */
import { analyzeSaju, deriveYongsin, type SajuRelation } from "@/lib/saju";
import { parseNamingParams } from "@/lib/naming/params";

const CASES: [string, string, string, string?][] = [
  ["방합(巳午未)", "2026-05-09", "19:17"],
  ["방합(申酉戌), 충 무효", "2025-11-22", "13:27"],
  ["삼합(寅午戌)", "2022-04-03", "11:49"],
  ["삼합(申子辰), 충 무효", "2017-01-03", "08:06"],
  ["반합 + 천간합 합화", "2020-10-06", "04:02"],
  ["육합 합화(寅亥 목)", "2019-02-17", "04:17"],
  ["육합 합화(子丑 토)", "2021-01-26", "03:35"],
  ["육합 묶임(巳申)", "2016-05-25", "10:56"],
  ["천간합 합화(丁壬 목)", "2017-02-20", "01:31"],
  ["천간합 묶임(戊癸)", "2018-12-04", "04:42"],
  ["일간합(乙庚)", "2025-03-27", "09:17"],
  ["쟁합(乙庚乙)", "2020-09-14", "18:56"],
  ["붙은 충(丑未) + 삼형", "2016-01-17", "12:45"],
  ["떨어진 충(卯酉)", "2024-02-02", "19:01"],
  ["자형(辰辰)", "2022-04-17", "08:48"],
  ["반합 + 충 + 형", "2026-03-03", "10:39"],
  ["1단계 B 서울", "2024-11-20", "09:33", "seoul"],
  ["1단계 B 제주", "2024-11-20", "09:33", "jeju"],
];

const short = (r: SajuRelation) =>
  `${r.chars} ${r.kind}${r.status === "성립" && r.element ? `→${r.element}` : ""}${r.status === "묶임" ? "(묶임)" : ""}${r.status === "표시만" ? "(표시만)" : ""}`;
const pct = (s: Record<string, number>) => {
  const t = Object.values(s).reduce((a, b) => a + b, 0);
  return (["목", "화", "토", "금", "수"] as const).map((e) => `${e}${Math.round((s[e] / t) * 100)}`).join(" ");
};

console.log("| 사례 | 생년월일시 | 사주 | 합·충·형 | 오행 % 전 → 후 | 강약 | 용신 전 | 용신 후 |");
console.log("|---|---|---|---|---|---|---|---|");
for (const [label, date, time, place = "seoul"] of CASES) {
  const r = parseNamingParams({ surname: "김", sh: "金", date, time, place });
  if (!r.ok) throw new Error(r.error);
  const { pillars: p, yongsin: after } = analyzeSaju(r.value.birth);
  const before = deriveYongsin(p, { ignoreRelations: true });
  const yb = `${before.yongsin}(${before.method})`;
  const ya = `${after.yongsin}(${after.method})`;
  console.log(
    `| ${label} | ${date} ${time} | ${[p.year, p.month, p.day, p.hour!].map((x) => x.hanja).join(" ")} | ${after.relations.map(short).join(", ") || "-"} | ${pct(before.scores)} → ${pct(after.scores)} | ${before.strength}→${after.strength} | ${yb} | ${yb === ya ? ya : `**${ya}**`} |`
  );
}
