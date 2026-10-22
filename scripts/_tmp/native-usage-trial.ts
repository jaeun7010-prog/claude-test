/**
 * 순우리말 이름 쓰임 가점 시험: npx tsx scripts/_tmp/native-usage-trial.ts
 * 성 5 × 용신 5 × 남/여 = 50건, 글자 수 상관없음(2~3자). 정렬 점수 = (우리말 이름 점수 + 가점) ÷ (100 + 자주 가점) × 100.
 * 표는 lib/naming/native/usage.ts (처음 시험은 새봄·어진 드묾, 미리내 가끔이던 초안으로 했다). 강한 놀림말은 맨 뒤. 가점 조합마다 상위 10·30의 쓰임 비율, 1위가 드묾인 건수, 상위 10 평균 점수를 센다.
 */
import { NATIVE_NAMES } from "@/lib/naming/native-names";
import { nativeLengthAllowed } from "@/lib/naming/native/length";
import { scoreNativeName, type NativeSaju } from "@/lib/naming/native/score";
import type { Element } from "@/lib/naming/types";
import { DRAFT_NATIVE_USAGE, type NativeUsage } from "@/lib/naming/native/usage";

const missing = NATIVE_NAMES.filter((n) => !DRAFT_NATIVE_USAGE[n.name]).map((n) => n.name);
if (missing.length) throw new Error("표에 없는 이름: " + missing.join(","));

const SURNAMES = ["김", "이", "박", "최", "정"];
const SAJU: Record<Element, NativeSaju> = {
  목: { needed: "목", favorable: "수", unfavorable: "금" },
  화: { needed: "화", favorable: "목", unfavorable: "수" },
  토: { needed: "토", favorable: "화", unfavorable: "목" },
  금: { needed: "금", favorable: "토", unfavorable: "화" },
  수: { needed: "수", favorable: "금", unfavorable: "토" },
};
const BONUS: [number, number][] = [[0, 0], [5, 2.5], [10, 5], [15, 7.5], [20, 10]];
const usageOf = (n: string): NativeUsage => DRAFT_NATIVE_USAGE[n][0];

function ranked(surname: string, saju: NativeSaju, g: "male" | "female", [f, s]: [number, number]) {
  return NATIVE_NAMES.filter((n) => (n.gender === g || n.gender === "neutral") && nativeLengthAllowed([...n.name].length, "any"))
    .map((name) => {
      const sc = scoreNativeName({ name, surname, saju });
      const u = usageOf(name.name);
      const bonus = u === "frequent" ? f : u === "sometimes" ? s : 0;
      return { name: name.name, total: sc.total, u, strong: sc.teasing?.level === "strong", rank: ((sc.total + bonus) / (100 + f)) * 100 };
    })
    .sort((a, b) => Number(a.strong) - Number(b.strong) || b.rank - a.rank || a.name.localeCompare(b.name, "ko"));
}

const pct = (n: number, d: number) => `${Math.round((n / d) * 100)}%`;
console.log("가점(자주/가끔) | 상위10 자주·가끔·드묾 | 상위30 자주·가끔·드묾 | 1위 드묾 | 상위10 평균 점수 | 상위10 최저 점수");
for (const b of BONUS) {
  const c10 = { frequent: 0, sometimes: 0, rare: 0 }, c30 = { ...c10 };
  let rareTop = 0, sum10 = 0, n10 = 0, min10 = 100;
  for (const surname of SURNAMES)
    for (const el of Object.keys(SAJU) as Element[])
      for (const g of ["male", "female"] as const) {
        const r = ranked(surname, SAJU[el], g, b);
        r.slice(0, 10).forEach((x) => { c10[x.u]++; sum10 += x.total; n10++; min10 = Math.min(min10, x.total); });
        r.slice(0, 30).forEach((x) => c30[x.u]++);
        if (r[0].u === "rare") rareTop++;
      }
  const t10 = c10.frequent + c10.sometimes + c10.rare, t30 = c30.frequent + c30.sometimes + c30.rare;
  console.log(
    `+${b[0]}/+${b[1]} | ${pct(c10.frequent, t10)} ${pct(c10.sometimes, t10)} ${pct(c10.rare, t10)} | ${pct(c30.frequent, t30)} ${pct(c30.sometimes, t30)} ${pct(c30.rare, t30)} | ${rareTop}/50 | ${(sum10 / n10).toFixed(1)} | ${min10}`
  );
}
const counts = { frequent: 0, sometimes: 0, rare: 0 };
NATIVE_NAMES.forEach((n) => counts[usageOf(n.name)]++);
console.log(`\n표: 자주 ${counts.frequent} · 가끔 ${counts.sometimes} · 드묾 ${counts.rare}`);

// 예시: 김씨 목·금 남/여 상위 10을 가점별로
for (const el of ["목", "금"] as Element[])
  for (const g of ["female", "male"] as const)
    for (const b of [[0, 0], [10, 5], [15, 7.5]] as [number, number][])
      console.log(`김 ${el} ${g === "female" ? "여" : "남"} +${b[0]}/+${b[1]}: ` + ranked("김", SAJU[el], g, b).slice(0, 10).map((x) => `${x.name}(${x.u[0]}${x.total})`).join(" "));

// +10/+5에서 상위 10에 자주 남는 드묾 이름 (50건 중 몇 번)
const rareHits = new Map<string, number>();
for (const surname of SURNAMES)
  for (const el of Object.keys(SAJU) as Element[])
    for (const g of ["male", "female"] as const)
      ranked(surname, SAJU[el], g, [10, 5]).slice(0, 10).filter((x) => x.u === "rare").forEach((x) => rareHits.set(x.name, (rareHits.get(x.name) ?? 0) + 1));
console.log("\n+10/+5 상위 10의 드묾 이름: " + [...rareHits].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([n, c]) => `${n} ${c}`).join(" · "));
