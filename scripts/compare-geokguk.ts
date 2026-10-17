/**
 * 3단계(격국) 전후 용신 비교: npx tsx scripts/compare-geokguk.ts
 * 보강 전 = 격국 없이 억부·조후 + 합·충·형 (deriveYongsin의 ignoreGeokguk)
 * 1) 테스트 사주 표, 2) 무작위 5,000개(2015~2026년생, seed 20261017) 용신 변화율과 외격 후보·경계 사주 비율
 */
import { analyzeSaju, deriveYongsin } from "@/lib/saju";
import { parseNamingParams } from "@/lib/naming/params";

const CASES: [string, string, string, string?][] = [
  ["정관격 신강", "2018-02-26", "08:53"],
  ["정관격 신약", "2019-04-16", "18:50"],
  ["칠살격 신강", "2015-02-11", "04:25"],
  ["칠살격 신약", "2018-11-06", "12:00"],
  ["정재격 신강", "2020-01-22", "14:14"],
  ["편재격 중화", "2018-11-08", "05:13"],
  ["정인격 신강", "2018-02-04", "16:30"],
  ["편인격 신약", "2015-07-02", "00:34"],
  ["식신격 극신강", "2015-02-09", "06:40"],
  ["식신격 신약", "2017-08-27", "18:43"],
  ["상관격 중화", "2015-06-07", "17:00"],
  ["상관격 극신약", "2017-01-02", "23:51"],
  ["건록격 신강", "2017-03-09", "03:37"],
  ["월겁격 신강", "2021-10-28", "04:55"],
  ["양인격 신강", "2015-03-09", "09:07"],
  ["건록격 신약(격국 미적용)", "2020-03-02", "15:07"],
  ["파격: 정관격 + 상관", "2017-09-14", "02:01"],
  ["파격: 칠살격 무제어", "2022-03-27", "16:10"],
  ["파격: 식신격 + 편인", "2023-06-05", "15:55"],
  ["외격 후보: 종왕", "2016-12-07", "18:24"],
  ["외격 후보: 종살", "2017-10-14", "12:58"],
  ["외격 후보: 화격", "2015-07-06", "12:15"],
  ["1단계 B 서울 (세력 차이 1.36%)", "2024-11-20", "09:33", "seoul"],
  ["1단계 B 제주", "2024-11-20", "09:33", "jeju"],
];

const analyze = (date: string, time: string, place = "seoul") => {
  const r = parseNamingParams({ surname: "김", sh: "金", date, time, place });
  if (!r.ok) throw new Error(r.error);
  const { pillars: p, yongsin: after } = analyzeSaju(r.value.birth);
  return { p, after, before: deriveYongsin(p, { ignoreGeokguk: true }) };
};

console.log("| 사례 | 생년월일시 | 사주 | 격 | 강약 | 성격·파격 | 상신 | 경계 | 외격 후보 | 용신 전 | 용신 후 |");
console.log("|---|---|---|---|---|---|---|---|---|---|---|");
for (const [label, date, time, place] of CASES) {
  const { p, after, before } = analyze(date, time, place);
  const g = after.geokguk!;
  const yb = `${before.yongsin}(${before.method})`;
  const ya = `${after.yongsin}(${after.method})`;
  console.log(
    `| ${label} | ${date} ${time}${place ? ` ${place}` : ""} | ${[p.year, p.month, p.day, p.hour!].map((x) => x.hanja).join(" ")} | ${g.name} | ${after.strength} (${after.selfRatio}) | ${g.status}${g.applied ? "" : " → 억부"} | ${g.sangsin ? `${g.sangsin.group}(${g.sangsin.element})` : "-"} | ${g.borderline.length ? "경계" : "-"} | ${g.outer ? `${g.outer.kind}(용신 ${g.outer.yongsin})` : "-"} | ${yb} | ${before.yongsin === after.yongsin ? ya : `**${ya}**`} |`
  );
}

// --- 무작위 5,000개 ---
let seed = 20261017;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const N = 5000;
const count = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const geoks = new Map<string, number>();
const methods = new Map<string, number>();
const outers = new Map<string, number>();
let changed = 0, changedApplied = 0, applied = 0, broken = 0, notApplied = 0;
let border = 0, borderRatio = 0, borderPressure = 0, outer = 0;
for (let i = 0; i < N; i++) {
  const y = 2015 + Math.floor(rnd() * 12);
  const m = 1 + Math.floor(rnd() * 12);
  const d = 1 + Math.floor(rnd() * 28);
  const h = Math.floor(rnd() * 24);
  const mi = Math.floor(rnd() * 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  const { after, before } = analyze(`${y}-${pad(m)}-${pad(d)}`, `${pad(h)}:${pad(mi)}`);
  const g = after.geokguk!;
  count(geoks, g.name);
  count(methods, after.method);
  if (after.yongsin !== before.yongsin) changed++;
  if (g.applied) {
    applied++;
    if (after.yongsin !== before.yongsin) changedApplied++;
  } else if (g.status === "파격") broken++;
  else notApplied++;
  if (g.borderline.length) border++;
  if (g.borderline.some((t) => t.startsWith("강약"))) borderRatio++;
  if (g.borderline.some((t) => t.startsWith("억부"))) borderPressure++;
  if (g.outer) {
    outer++;
    count(outers, g.outer.kind);
  }
}
const pct = (n: number, of = N) => `${n} (${((n / of) * 100).toFixed(1)}%)`;
const list = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v)}`).join(", ");
console.log(`\n무작위 ${N}개 (2015~2026년생, 서울, seed 20261017)`);
console.log(`- 용신 변화: ${pct(changed)} / 격국 적용 사주 중 변화 ${pct(changedApplied, applied)}`);
console.log(`- 격국 적용 ${pct(applied)} · 파격 → 억부 ${pct(broken)} · 신약한 건록·월겁·양인격 → 억부 ${pct(notApplied)}`);
console.log(`- 최종 방식: ${list(methods)}`);
console.log(`- 격 분포: ${list(geoks)}`);
console.log(`- 외격 후보: ${pct(outer)} — ${list(outers)}`);
console.log(`- 경계 사주: ${pct(border)} — 강약 비율 경계 ${pct(borderRatio)}, 억부 세력 1·2위 차이 ${pct(borderPressure)}`);
