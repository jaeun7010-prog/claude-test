/**
 * 셀프 작명 C등급 진단 (임시): npx tsx --env-file=.env.local scripts/_tmp/self-diagnose.ts
 * self-naming-check.ts와 같은 1,000건(흔한 이름 20 × 성 5 × 사주 10).
 *  1) 지금 점수의 1위 조합에서 항목별로 깎인 점수(총점 기준) 평균, 따로 볼 이름 5개
 *  2) 발음오행 관계 모양 (성씨별, 소리로만 정해짐)
 *  3) 지금 / A안 / B안 / A+B안의 1위 등급 분포·"A 이상 없음" 비율
 *  4) 추천받기 상위 30개의 항목별 깎인 점수 (비교용)
 * A안: 발음오행을 빼고 사주 보완 35 · 수리 30 · 자원오행 15를 100점으로 환산
 * B안: 발음오행 항목 = 상극 없음 100 · 한 곳 80(총점 −4) · 두 곳 이상 40(총점 −12). 상생·비화·설은 감점 없음
 * A+B안: A안 점수에서 B안의 상극 감점(−4 / −12점)만 뺀다
 * B′안: 지금 관계 점수(생 100 · 비화 70 · 설 50 · 극 0) 그대로, 이름 쪽 상극이 한 곳뿐이면 그 극을 설(50)로 본다
 */
import { createClient } from "@supabase/supabase-js";
import { analyzeSaju } from "@/lib/saju";
import { analyzeName, pronunciationWeights } from "@/lib/naming/analyze";
import { fetchByEum, fetchSurname } from "@/lib/naming/hanja-repo";
import { parseNamingParams } from "@/lib/naming/params";
import type { NameHanja } from "@/lib/naming/recommend";
import { selfSlotOf } from "@/lib/naming/self";
import { DISPLAY_LIMIT, runNaming } from "@/lib/naming/service";
import { SAJU_CHAR_SCORE, SCORE_WEIGHTS, gradeOf, sajuCharScore } from "@/lib/naming/score";
import { withSurnameElements } from "@/lib/naming/surnames";
import type { Element, Grade, NamingAnalysis } from "@/lib/naming/types";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const SURNAMES: [string, string][] = [["김", "金"], ["이", "李"], ["박", "朴"], ["최", "崔"], ["정", "鄭"]];
const BIRTHS = [
  ["2024-11-20", "09:33", "jeju"], ["2024-11-20", "09:33", "seoul"], ["2024-05-10", "07:28", "seoul"],
  ["2023-01-05", "23:25", "seoul"], ["1987-07-15", "14:20", "seoul"], ["2022-08-08", "12:10", "seoul"],
  ["2025-12-24", "18:50", "seoul"], ["2024-09-02", "06:58", "seoul"], ["2025-03-03", "03:15", "seoul"],
  ["2025-07-21", "16:40", "seoul"],
];
const NAMES: [string, "female" | "male"][] = [
  ..."서윤 서연 지우 하윤 서아 하은 지유 수아 지아 윤서".split(" ").map((n) => [n, "female"] as [string, "female"]),
  ..."도윤 서준 하준 시우 은우 이준 지호 유준 선우 도현".split(" ").map((n) => [n, "male"] as [string, "male"]),
];
/** KNOWN=1: 사주 보완을 채점할 수 있는 조합(자원오행 아는 글자가 하나 이상)만 본다 */
const KNOWN = process.env.KNOWN === "1";
const FOCUS = ["서윤", "하윤", "하은", "하준", "은우", "서연", "도윤"];
const KEYS = ["saju", "suri", "pronunciation", "resource"] as const;
type Key = (typeof KEYS)[number];
const LABEL: Record<Key, string> = { saju: "사주 보완", suri: "수리", pronunciation: "발음오행", resource: "자원오행" };
const r1 = (n: number) => Math.round(n * 10) / 10;

/** 항목별로 총점에서 깎인 점수 (없는 항목은 빼고 환산한 지금 방식과 같게) */
function lost(a: NamingAnalysis, keys: readonly Key[] = KEYS): Record<Key, number> {
  const w = keys.filter((k) => a.breakdown[k] !== null).reduce((s, k) => s + SCORE_WEIGHTS[k], 0);
  const out = { saju: 0, suri: 0, pronunciation: 0, resource: 0 };
  for (const k of keys) {
    const s = a.breakdown[k];
    if (s !== null) out[k] = (SCORE_WEIGHTS[k] / w) * (100 - s);
  }
  return out;
}

/** 발음오행 이름 쪽 관계(성 끝 글자 → 이름)의 상극 수. 단성이면 관계 전체 */
const clashes = (a: NamingAnalysis, surnameLen: number) =>
  a.pronunciation.relations.slice(surnameLen - 1).filter((r) => r === "극").length;
const bPron = (k: number) => (k === 0 ? 100 : k === 1 ? 80 : 40);
const bPenalty = (k: number) => (k === 0 ? 0 : k === 1 ? 4 : 12);

function weighted(a: NamingAnalysis, pron: number | null, saju: number | null = a.breakdown.saju): number {
  const parts: [number | null, number][] = [
    [saju, SCORE_WEIGHTS.saju],
    [a.breakdown.suri, SCORE_WEIGHTS.suri],
    [pron, SCORE_WEIGHTS.pronunciation],
    [a.breakdown.resource, SCORE_WEIGHTS.resource],
  ];
  let s = 0, w = 0;
  for (const [v, wt] of parts) if (v !== null) { s += v * wt; w += wt; }
  return r1(s / w);
}

const RS = { 생: 100, 비화: 70, 설: 50, 극: 0 } as const;
/** B′안 발음오행 (단성 2자 이름 기준) */
function b2Pron(a: NamingAnalysis, k: number): number {
  if (k !== 1) return a.breakdown.pronunciation;
  const w = pronunciationWeights(1, 2);
  const rels = a.pronunciation.relations;
  return r1(rels.reduce((s, r, i) => s + (r === "극" ? 50 : RS[r]) * w[i], 0) / w.reduce((x, y) => x + y, 0));
}

/** C안 사주 보완: 용신 글자가 하나 있고 기신 글자가 없으면 100, 아니면 지금 점수 */
function cSaju(a: NamingAnalysis, given: { element: Element | null }[], y: { neededElement: Element; favorableElement: Element; unfavorableElement: Element }) {
  if (a.breakdown.saju === null) return null;
  const per = given.map((c) => sajuCharScore(c.element, { needed: y.neededElement, favorable: y.favorableElement, unfavorable: y.unfavorableElement }) ?? SAJU_CHAR_SCORE.neutral);
  if (a.resource?.arrangement === "통관") per[0] = Math.max(per[0], SAJU_CHAR_SCORE.tonggwan);
  return per.includes(1) && !per.includes(0) ? 100 : a.breakdown.saju;
}

const SCHEMES = {
  지금: (a: NamingAnalysis) => a.totalScore,
  A안: (a: NamingAnalysis) => weighted(a, null),
  B안: (a: NamingAnalysis, k: number) => weighted(a, bPron(k)),
  "A+B안": (a: NamingAnalysis, k: number) => r1(weighted(a, null) - bPenalty(k)),
  "B′안": (a: NamingAnalysis, k: number) => weighted(a, b2Pron(a, k)),
  C안: (a: NamingAnalysis, _k: number, cs: number | null) => weighted(a, a.breakdown.pronunciation, cs),
  "B+C안": (a: NamingAnalysis, k: number, cs: number | null) => weighted(a, bPron(k), cs),
  "A+B+C안": (a: NamingAnalysis, k: number, cs: number | null) => r1(weighted(a, null, cs) - bPenalty(k)),
} as const;
type Scheme = keyof typeof SCHEMES;

(async () => {
  const byEum = new Map<string, NameHanja[]>();
  const rowsOf = async (eum: string) => {
    if (!byEum.has(eum)) byEum.set(eum, await fetchByEum(supabase, eum));
    return byEum.get(eum)!;
  };
  const surnames = new Map<string, NameHanja[]>();
  for (const [s, sh] of SURNAMES) surnames.set(s, withSurnameElements((await fetchSurname(supabase, [sh], [s]))!));

  const sumAll = { saju: 0, suri: 0, pronunciation: 0, resource: 0 };
  const sumName = new Map<string, Record<Key, number> & { n: number; total: number }>();
  const pronShape = new Map<string, string>(); // 이름 → 성씨별 관계
  const dist: Record<Scheme, Record<Grade, number>> = Object.fromEntries(
    Object.keys(SCHEMES).map((k) => [k, { S: 0, A: 0, B: 0, C: 0 }])
  ) as never;
  const distFocus: Record<Scheme, Record<Grade, number>> = JSON.parse(JSON.stringify(dist));
  const clashCount = [0, 0, 0];
  // 소리 안에서 각 항목 최고값 (그 소리로 낼 수 있는 최고)
  const bestItem = { saju: 0, suri: 0, resource: 0 };
  let runs = 0;
  let total = 0;
  let noSaju = 0;
  let slotChars = 0, slotUnknown = 0;
  const top1Changed = Object.fromEntries(Object.keys(SCHEMES).map((k) => [k, 0])) as Record<Scheme, number>;
  const top1NoResource = Object.fromEntries(Object.keys(SCHEMES).map((k) => [k, 0])) as Record<Scheme, number>;
  let cHits = 0, cGain = 0;

  for (const [name, gender] of NAMES) {
    const acc = { saju: 0, suri: 0, pronunciation: 0, resource: 0, n: 0, total: 0 };
    const shapes: string[] = [];
    for (const [s, sh] of SURNAMES) {
      for (const [date, time, place] of BIRTHS) {
        const p = parseNamingParams({ surname: s, sh, date, time, place, gender });
        if (!p.ok) throw p.error;
        const { yongsin, huisin, gisin } = analyzeSaju(p.value.birth).yongsin;
        const sajuArgs = { neededElement: yongsin, favorableElement: huisin, unfavorableElement: gisin };
        const slots = await Promise.all([...name].map(async (e) => selfSlotOf(e, await rowsOf(e), gender).chars));
        // 1위 고르기는 self-rank.ts와 같게: 애매·어색이 없는 조합 먼저, 점수 → 사주 → 수리 → 발음 순
        const all: { a: NamingAnalysis; ok: boolean; hanja: string; cs: number | null }[] = [];
        for (const x of slots[0]) for (const y of slots[1]) {
          if (x.hanja === y.hanja) continue;
          const a = analyzeName({ surname: surnames.get(s)!, givenName: [x, y], ...sajuArgs });
          if (KNOWN && a.breakdown.saju === null) continue;
          const ok = [x, y].every((c) => c.suitability === "good" || c.suitability === "normal");
          all.push({ a, ok, hanja: x.hanja + y.hanja, cs: cSaju(a, [x, y], sajuArgs) });
        }
        const k = clashes(all[0].a, 1);
        const pickTop = (sc: Scheme) =>
          [...all].sort((p1, p2) =>
            +p2.ok - +p1.ok ||
            SCHEMES[sc](p2.a, k, p2.cs) - SCHEMES[sc](p1.a, k, p1.cs) ||
            (p2.a.breakdown.saju ?? -1) - (p1.a.breakdown.saju ?? -1) ||
            p2.a.breakdown.suri - p1.a.breakdown.suri
          )[0];
        const now = pickTop("지금");
        if (now.a.breakdown.saju === null) noSaju++;
        if (now.cs !== null && now.cs !== now.a.breakdown.saju) { cHits++; cGain += ((now.cs - now.a.breakdown.saju!) * SCORE_WEIGHTS.saju) / 100; }
        if (s === "김" && date === BIRTHS[0][0] && place === BIRTHS[0][2])
          for (const sl of slots) for (const c of sl) { slotChars++; if (!c.element) slotUnknown++; }
        const l = lost(now.a);
        for (const key of KEYS) { sumAll[key] += l[key]; acc[key] += l[key]; }
        acc.n++; acc.total += now.a.totalScore; total += now.a.totalScore;
        runs++;
        clashCount[k]++;
        const eligible = all.filter((x) => x.ok);
        for (const key of ["saju", "suri", "resource"] as const)
          bestItem[key] += Math.max(...eligible.map((x) => x.a.breakdown[key] ?? 0));
        for (const sc of Object.keys(SCHEMES) as Scheme[]) {
          const t = pickTop(sc);
          // 점수가 같아 순서만 바뀐 경우는 세지 않는다
          if (t.hanja !== now.hanja && t.a.totalScore !== now.a.totalScore) top1Changed[sc]++;
          if (t.a.breakdown.resource === null) top1NoResource[sc]++;
          const g = gradeOf(SCHEMES[sc](t.a, k, t.cs));
          dist[sc][g]++;
          if (FOCUS.includes(name)) distFocus[sc][g]++;
        }
        if (date === BIRTHS[0][0] && place === BIRTHS[0][2])
          shapes.push(`${s}: ${now.a.pronunciation.elements.join("→")} (${now.a.pronunciation.relations.join("·")}) ${now.a.breakdown.pronunciation}`);
      }
    }
    sumName.set(name, acc);
    pronShape.set(name, shapes.join(" / "));
  }

  const row = (label: string, v: Record<Key, number>, n: number, tot: number) =>
    `${label}\t평균 총점 ${r1(tot / n)}\t` + KEYS.map((k) => `${LABEL[k]} −${r1(v[k] / n)}`).join(" · ");
  console.log(`## 1) 지금 점수 1위 조합에서 깎인 점수 (총점 기준, ${runs}건${KNOWN ? ", 자원오행 아는 조합만" : ""})`);
  console.log(`사주 보완·자원오행을 채점하지 못한 1위: ${noSaju}건 (그 항목은 0으로 들어감)`);
  console.log(`후보 한자 중 자원오행 모름: ${slotUnknown}/${slotChars}자 (${r1((slotUnknown / slotChars) * 100)}%, 20개 이름 자리 합)`);
  console.log(`배점: 사주 보완 ${SCORE_WEIGHTS.saju} · 수리 ${SCORE_WEIGHTS.suri} · 발음오행 ${SCORE_WEIGHTS.pronunciation} · 자원오행 ${SCORE_WEIGHTS.resource}`);
  console.log(row("전체", sumAll, runs, total));
  for (const [name, acc] of sumName) console.log(row(`${FOCUS.includes(name) ? "★" : ""}${name}`, acc, acc.n, acc.total));
  console.log(`\n그 소리로 낼 수 있는 항목 최고값 평균 (애매·어색 없는 조합): 사주 보완 ${r1(bestItem.saju / runs)} · 수리 ${r1(bestItem.suri / runs)} · 자원오행 ${r1(bestItem.resource / runs)} (발음오행은 소리로 고정)`);
  console.log(`사주 보완 "두 글자 모두" 규칙으로 깎인 1위: ${cHits}건, 그 1위들 평균 −${cHits ? r1(cGain / cHits) : 0}점 (전체 평균 −${r1(cGain / runs)}점, 사주 보완 35점 배점 그대로 계산)`);
  console.log(`발음오행 상극 수 (이름 쪽 관계 2곳 중): 0곳 ${clashCount[0]} · 1곳 ${clashCount[1]} · 2곳 ${clashCount[2]}건`);

  console.log(`\n## 2) 발음오행 모양 (소리로만 정해짐, 성씨별)`);
  for (const [name, sh] of pronShape) console.log(`${FOCUS.includes(name) ? "★" : ""}${name}\t${sh}`);

  console.log(`\n## 3) 1위 등급 분포 (${runs}건)`);
  for (const sc of Object.keys(SCHEMES) as Scheme[]) {
    const d = dist[sc], f = distFocus[sc];
    const fN = f.S + f.A + f.B + f.C;
    console.log(`${sc}\tS${d.S} A${d.A} B${d.B} C${d.C}\tA 이상 없음 ${r1(((d.B + d.C) / runs) * 100)}%\t1위 한자 바뀜 ${top1Changed[sc]} · 1위가 자원오행 모름 ${top1NoResource[sc]}\t| 7개 이름 S${f.S} A${f.A} B${f.B} C${f.C} (A 이상 없음 ${r1(((f.B + f.C) / fN) * 100)}%)`);
  }

  if (KNOWN) return;
  console.log(`\n## 4) 추천받기 상위 ${DISPLAY_LIMIT}개의 깎인 점수 (지금 엔진, 여·남 각 50건)`);
  for (const gender of ["female", "male"] as const) {
    const sum = { saju: 0, suri: 0, pronunciation: 0, resource: 0 };
    const top1 = { saju: 0, suri: 0, pronunciation: 0, resource: 0 };
    let n = 0, t = 0, n1 = 0, t1 = 0;
    for (const [s, sh] of SURNAMES) for (const [date, time, place] of BIRTHS) {
      const p = parseNamingParams({ surname: s, sh, date, time, place, gender });
      if (!p.ok) throw p.error;
      const r = await runNaming(supabase, p.value);
      if (!r.ok) throw r.error;
      r.groups.slice(0, DISPLAY_LIMIT).forEach((g, i) => {
        const a = g.options[0].analysis;
        const l = lost(a);
        for (const k of KEYS) { sum[k] += l[k]; if (i === 0) top1[k] += l[k]; }
        n++; t += a.totalScore;
        if (i === 0) { n1++; t1 += a.totalScore; }
      });
    }
    console.log(row(`${gender === "female" ? "여" : "남"} 상위 30`, sum, n, t));
    console.log(row(`${gender === "female" ? "여" : "남"} 1위`, top1, n1, t1));
  }
})();
