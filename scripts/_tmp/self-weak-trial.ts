/**
 * 셀프 작명 약한 B·C안 시험 (임시): npx tsx --env-file=.env.local scripts/_tmp/self-weak-trial.ts
 * self-naming-check.ts와 같은 1,000건 (흔한 이름 20 × 성 5 × 테스트 사주 10). 엔진은 바꾸지 않고 분석 결과에서 다시 계산한다.
 *  - 약한 B: 발음오행 감점(100 − 점수)을 f만큼만 반영 (rec-diagnose.ts의 PRON_F와 같음)
 *  - 약한 C: 용신 글자가 있으면 희신(통관)·중립 글자를 H·N으로 본다 (SAJU_H/SAJU_N과 같음)
 *  - 자원오행 모르는 조합 처리 두 가지:
 *      제외: 사주 보완을 판단할 수 없는 조합(두 글자 모두 자원오행 모름)은 1위 후보에서 뺀다
 *      중립: 그런 조합의 사주 보완을 중립(30점)으로 본다 (자원오행 항목은 그대로 빠짐)
 */
import { createClient } from "@supabase/supabase-js";
import { analyzeSaju } from "@/lib/saju";
import { analyzeName } from "@/lib/naming/analyze";
import { fetchByEum, fetchSurname } from "@/lib/naming/hanja-repo";
import { parseNamingParams } from "@/lib/naming/params";
import type { NameHanja } from "@/lib/naming/recommend";
import { selfSlotOf } from "@/lib/naming/self";
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
const FOCUS = ["서윤", "하윤", "하은", "서연", "하준", "은우", "도윤"];
const r1 = (n: number) => Math.round(n * 10) / 10;

/** sb: 처음 B안 (이름 쪽 상극 0곳 100 · 1곳 80 · 2곳 이상 40, 상생·비화·설 감점 없음) */
interface Scheme { name: string; f?: number; sb?: boolean; h?: number; n?: number }
const SCHEMES: Scheme[] = [
  { name: "지금" },
  { name: "B×1/3", f: 1 / 3 }, { name: "B×1/2", f: 0.5 }, { name: "B×2/3", f: 2 / 3 },
  { name: "C(90/80)", h: 0.8, n: 0.6 }, { name: "C(85/70)", h: 0.7, n: 0.4 },
  { name: "B×1/2+C(90/80)", f: 0.5, h: 0.8, n: 0.6 }, { name: "B×1/2+C(85/70)", f: 0.5, h: 0.7, n: 0.4 },
  { name: "B×2/3+C(90/80)", f: 2 / 3, h: 0.8, n: 0.6 }, { name: "B×2/3+C(85/70)", f: 2 / 3, h: 0.7, n: 0.4 },
  { name: "B(상극만)", sb: true }, { name: "B(상극만)+C(90/80)", sb: true, h: 0.8, n: 0.6 }, { name: "B(상극만)+C(85/70)", sb: true, h: 0.7, n: 0.4 },
];
type Y = { neededElement: Element; favorableElement: Element; unfavorableElement: Element };

/** 엔진의 사주 보완 글자 점수 (오행 모르는 글자는 중립) */
function perChar(a: NamingAnalysis, given: { element: Element | null }[], y: Y) {
  const per = given.map((c) => sajuCharScore(c.element, { needed: y.neededElement, favorable: y.favorableElement, unfavorable: y.unfavorableElement }) ?? SAJU_CHAR_SCORE.neutral);
  if (a.resource?.arrangement === "통관") per[0] = Math.max(per[0], SAJU_CHAR_SCORE.tonggwan);
  return per;
}

function score(a: NamingAnalysis, per: number[], sc: Scheme, unknownNeutral: boolean): number | null {
  let saju = a.breakdown.saju;
  if (saju === null) {
    if (!unknownNeutral) return null;
    saju = SAJU_CHAR_SCORE.neutral * 100;
  } else if (sc.h !== undefined && per.includes(1)) {
    const m = per.map((v) => (v === 1 ? 1 : v >= 0.6 ? sc.h! : v >= 0.3 ? sc.n! : 0));
    saju = r1((m.reduce((x, y) => x + y, 0) / m.length) * 100);
  }
  const k = a.pronunciation.relations.filter((r) => r === "극").length;
  const pron = sc.sb ? (k === 0 ? 100 : k === 1 ? 80 : 40) : sc.f !== undefined ? r1(100 - sc.f * (100 - a.breakdown.pronunciation)) : a.breakdown.pronunciation;
  const parts: [number | null, number][] = [
    [saju, SCORE_WEIGHTS.saju], [a.breakdown.suri, SCORE_WEIGHTS.suri],
    [pron, SCORE_WEIGHTS.pronunciation], [a.breakdown.resource, SCORE_WEIGHTS.resource],
  ];
  let s = 0, w = 0;
  for (const [v, wt] of parts) if (v !== null) { s += v * wt; w += wt; }
  return r1(s / w);
}

(async () => {
  const byEum = new Map<string, NameHanja[]>();
  const rowsOf = async (eum: string) => {
    if (!byEum.has(eum)) byEum.set(eum, await fetchByEum(supabase, eum));
    return byEum.get(eum)!;
  };
  const surnames = new Map<string, NameHanja[]>();
  for (const [s, sh] of SURNAMES) surnames.set(s, withSurnameElements((await fetchSurname(supabase, [sh], [s]))!));

  type Acc = { all: Record<Grade, number>; focus: Record<Grade, number>; unknownTop: number };
  const blank = (): Acc => ({ all: { S: 0, A: 0, B: 0, C: 0 }, focus: { S: 0, A: 0, B: 0, C: 0 }, unknownTop: 0 });
  const res = { 제외: SCHEMES.map(blank), 중립: SCHEMES.map(blank) };
  const topHanja = new Map<string, number>();
  let runs = 0;

  for (const [name, gender] of NAMES) {
    for (const [s, sh] of SURNAMES) for (const [date, time, place] of BIRTHS) {
      const p = parseNamingParams({ surname: s, sh, date, time, place, gender });
      if (!p.ok) throw p.error;
      const { yongsin, huisin, gisin } = analyzeSaju(p.value.birth).yongsin;
      const y: Y = { neededElement: yongsin, favorableElement: huisin, unfavorableElement: gisin };
      const slots = await Promise.all([...name].map(async (e) => selfSlotOf(e, await rowsOf(e), gender).chars));
      const combos: { a: NamingAnalysis; per: number[]; ok: boolean; hanja: string }[] = [];
      for (const x of slots[0]) for (const z of slots[1]) {
        if (x.hanja === z.hanja) continue;
        const a = analyzeName({ surname: surnames.get(s)!, givenName: [x, z], ...y });
        combos.push({ a, per: perChar(a, [x, z], y), ok: [x, z].every((c) => c.suitability === "good" || c.suitability === "normal"), hanja: x.hanja + z.hanja });
      }
      runs++;
      for (const mode of ["제외", "중립"] as const) {
        SCHEMES.forEach((sc, i) => {
          let best: { c: (typeof combos)[number]; v: number } | null = null;
          for (const c of combos) {
            const v = score(c.a, c.per, sc, mode === "중립");
            if (v === null) continue;
            // self-rank.ts와 같게: 애매·어색 없는 조합 먼저, 점수 → 사주 보완 → 수리
            if (!best || +c.ok > +best.c.ok || (c.ok === best.c.ok && (v > best.v ||
              (v === best.v && ((c.a.breakdown.saju ?? -1) > (best.c.a.breakdown.saju ?? -1) ||
                ((c.a.breakdown.saju ?? -1) === (best.c.a.breakdown.saju ?? -1) && c.a.breakdown.suri > best.c.a.breakdown.suri))))))
              best = { c, v };
          }
          const g = gradeOf(best!.v);
          const acc = res[mode][i];
          acc.all[g]++;
          if (FOCUS.includes(name)) acc.focus[g]++;
          if (best!.c.a.breakdown.saju === null) acc.unknownTop++;
          if (mode === "제외" && sc.name === "지금") for (const ch of best!.c.hanja) topHanja.set(ch, (topHanja.get(ch) ?? 0) + 1);
        });
      }
    }
  }

  for (const mode of ["제외", "중립"] as const) {
    console.log(`\n## 셀프 작명 1위 (${runs}건) — 자원오행 모르는 조합: ${mode}`);
    SCHEMES.forEach((sc, i) => {
      const { all, focus, unknownTop } = res[mode][i];
      const fN = focus.S + focus.A + focus.B + focus.C;
      console.log(`${sc.name}\tS${all.S} A${all.A} B${all.B} C${all.C}\tA 이상 없음 ${r1(((all.B + all.C) / runs) * 100)}%\t7개 이름 S${focus.S} A${focus.A} B${focus.B} C${focus.C} · B 이상 ${r1(((fN - focus.C) / fN) * 100)}%` + (mode === "중립" ? `\t1위가 자원오행 모름 ${unknownTop}` : ""));
    });
  }
  console.log(`\n## 지금(제외) 1위 조합에 자주 나온 한자 상위 20`);
  console.log([...topHanja].sort((x, z) => z[1] - x[1]).slice(0, 20).map(([h, c]) => `${h}${c}`).join(" "));
})();
