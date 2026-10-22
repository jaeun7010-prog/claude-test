/**
 * 순우리말 탭 6단계 검증: npx tsx scripts/native-distribution.ts [--top]
 * 무작위 사주 40개(2015~2026년생, 서울, seed 20261018, 성은 김·이·박·최·정을 돌아가며) × 성별 3가지(남·여·무관).
 * 서비스 코드(buildNativeCandidates, 통계 없음)로 보고 다음을 센다.
 *  - 화면 이름 수 (30개를 채우는가): 글자 수 상관없음 / 두 글자 / 외자
 *  - 화면 상위 30의 우리말 이름 점수 분포와 이름 쓰임(자주·가끔·드묾) 비율, 강한 놀림말이 화면에 들어오는 수
 *  - 용신별 건수·상위 10 평균 점수·자주 나오는 1위 이름
 * --top이면 사례마다 상위 10개를 출력한다.
 */
import { analyzeSaju } from "@/lib/saju";
import { buildNativeCandidates, NATIVE_DISPLAY_LIMIT, type NativeCandidate } from "@/lib/naming/native/service";
import { parseNamingParams, type NamingParams } from "@/lib/naming/params";
import type { Element } from "@/lib/naming/types";

const SURNAMES: [string, string][] = [["김", "金"], ["이", "李"], ["박", "朴"], ["최", "崔"], ["정", "鄭"]];
const GENDERS = [["male", "남자아이"], ["female", "여자아이"], ["neutral", "성별 무관"]] as const;
const N = 40;
const showTop = process.argv.includes("--top");

let seed = 20261018;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const pad = (n: number) => String(n).padStart(2, "0");
const births = Array.from({ length: N }, () => {
  const y = 2015 + Math.floor(rnd() * 12);
  const m = 1 + Math.floor(rnd() * 12);
  const d = 1 + Math.floor(rnd() * 28);
  const h = Math.floor(rnd() * 24);
  const mi = Math.floor(rnd() * 60);
  return { date: `${y}-${pad(m)}-${pad(d)}`, time: `${pad(h)}:${pad(mi)}` };
});

function params(i: number, gender: string, len: string): NamingParams {
  const [surname, sh] = SURNAMES[i % SURNAMES.length];
  const p = parseNamingParams({ surname, sh, ...births[i], place: "seoul", gender, len });
  if (!p.ok) throw new Error(p.error);
  return p.value;
}

/** 화면에 보이는 순서: 강한 놀림말은 맨 뒤 (result-list의 demoted), 나머지는 서비스 정렬 그대로 */
const display = (cs: NativeCandidate[]) =>
  [...cs.filter((c) => c.score.teasing?.level !== "strong"), ...cs.filter((c) => c.score.teasing?.level === "strong")].slice(
    0,
    NATIVE_DISPLAY_LIMIT
  );

const pct = (n: number, d: number) => `${d ? Math.round((n / d) * 100) : 0}%`;
const BUCKETS: [string, number][] = [["90+", 90], ["80대", 80], ["70대", 70], ["60대", 60], ["60 미만", -1]];

for (const [g, gLabel] of GENDERS) {
  const shown: Record<string, number[]> = { any: [], "2": [], "1": [] };
  const buckets = new Map<string, number>(BUCKETS.map(([k]) => [k, 0]));
  const usage30 = { frequent: 0, sometimes: 0, rare: 0 };
  const usage10 = { frequent: 0, sometimes: 0, rare: 0 };
  let strongShown = 0, hardShown = 0, total30 = 0;
  const byYongsin = new Map<Element, { n: number; sum10: number; tops: Map<string, number> }>();
  const tops = new Map<string, number>();

  for (let i = 0; i < N; i++) {
    for (const len of ["any", "2", "1"]) {
      const p = params(i, g, len);
      shown[len].push(display(buildNativeCandidates(p, analyzeSaju(p.birth), null).candidates).length);
    }
    const p = params(i, g, "any");
    const saju = analyzeSaju(p.birth);
    const d = display(buildNativeCandidates(p, saju, null).candidates);
    for (const c of d) {
      total30++;
      usage30[c.usage]++;
      const t = c.score.total;
      const b = BUCKETS.find(([, min]) => t >= min)!;
      buckets.set(b[0], buckets.get(b[0])! + 1);
      if (c.score.teasing?.level === "strong") strongShown++;
      if (c.score.hardToSay) hardShown++;
    }
    d.slice(0, 10).forEach((c) => usage10[c.usage]++);
    const y = saju.yongsin.yongsin;
    const e = byYongsin.get(y) ?? { n: 0, sum10: 0, tops: new Map() };
    e.n++;
    e.sum10 += d.slice(0, 10).reduce((s, c) => s + c.score.total, 0) / Math.min(10, d.length);
    e.tops.set(d[0].name.name, (e.tops.get(d[0].name.name) ?? 0) + 1);
    byYongsin.set(y, e);
    tops.set(d[0].name.name, (tops.get(d[0].name.name) ?? 0) + 1);
    if (showTop)
      console.log(
        `${p.surname} ${births[i].date} ${births[i].time} ${gLabel} 용신 ${y}: ` +
          d.slice(0, 10).map((c) => `${c.name.name}${Math.round(c.score.total)}${c.usage === "rare" ? "*" : ""}`).join(" ")
      );
  }

  const fill = (xs: number[]) =>
    `30개 채움 ${xs.filter((x) => x >= NATIVE_DISPLAY_LIMIT).length}/${N} · 평균 ${(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1)} · 최소 ${Math.min(...xs)}`;
  console.log(`\n## ${gLabel}`);
  console.log(`- 화면 이름 수: 상관없음 ${fill(shown.any)} / 두 글자 ${fill(shown["2"])} / 외자 ${fill(shown["1"])}`);
  console.log(`- 상위 30 점수 분포: ${[...buckets].map(([k, v]) => `${k} ${pct(v, total30)}`).join(" · ")}`);
  console.log(
    `- 이름 쓰임 (자주·가끔·드묾): 상위 10 ${pct(usage10.frequent, N * 10)} ${pct(usage10.sometimes, N * 10)} ${pct(usage10.rare, N * 10)} / 상위 30 ${pct(usage30.frequent, total30)} ${pct(usage30.sometimes, total30)} ${pct(usage30.rare, total30)}`
  );
  console.log(`- 화면 30개 안의 강한 놀림말 ${strongShown}개 · 발음 어려움 표시 ${hardShown}개`);
  console.log(`- 1위로 자주 나온 이름: ${[...tops].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${v}`).join(" · ")} (서로 다른 1위 ${tops.size}개)`);
  console.log("| 용신 | 사례 | 상위 10 평균 점수 | 1위 이름 |\n|---|---|---|---|");
  for (const [y, e] of [...byYongsin].sort((a, b) => b[1].n - a[1].n))
    console.log(
      `| ${y} | ${e.n} | ${(e.sum10 / e.n).toFixed(1)} | ${[...e.tops].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · ")} |`
    );
}
