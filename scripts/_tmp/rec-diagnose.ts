/**
 * 추천받기 진단 (임시): npx tsx --env-file=.env.local scripts/_tmp/rec-diagnose.ts
 * 표본은 grade-distribution.ts와 같다 (성 5 × 테스트 사주 10 = 50건) × 여·남.
 *  - 상위 30 등급: 서버 순서 상위 30 (grade-distribution.ts와 같은 기준)
 *  - 상위 15 흔한 이름 비율·사례 상위 10: 화면 순서 (기본 우선순위 + 같은 첫소리 3개 제한 + 채움 이름 맨 뒤)
 *  - 항목별 깎인 점수(화면 상위 30), 따로 볼 이름, 사주 보완 "두 글자 모두" 규칙의 영향(C안 규칙으로 바꿨을 때 오르는 점수)
 * 흔한 이름: scripts/_tmp/common-names.ts (기억 기반 표본). 목록 밖 소리: 이름 소리 목록(name-sounds.ts)에 없는 소리.
 * B·C안은 엔진에 임시 실험 지점이 있는 작업 폴더(git worktree)에서만 동작한다. 2026-10-24 시험에서는 worktree의
 * lib/naming/analyze.ts에 아래를 넣었다 (본 코드에는 넣지 않는다):
 *   - pronunciation = evaluateFlow(...) 바로 뒤:
 *       if (process.env.PRON_MODE === "B") { const k = pronunciation.relations.slice(pronSurname.length - 1).filter((r) => r === "극").length;
 *         pronunciation.score = k === 0 ? 100 : k === 1 ? 80 : 40; }
 *       if (process.env.PRON_F) pronunciation.score = round1(100 - Number(process.env.PRON_F) * (100 - pronunciation.score));
 *   - sajuScore = round1(...) 바로 뒤:
 *       if (process.env.SAJU_H && per.includes(1)) { const H = Number(process.env.SAJU_H), N = Number(process.env.SAJU_N);
 *         const m = per.map((v) => (v === 1 ? 1 : v >= 0.6 ? H : v >= 0.3 ? N : 0)); sajuScore = round1((m.reduce((a, b) => a + b, 0) / m.length) * 100); }
 * 셀프 작명 쪽 같은 안: scripts/_tmp/self-weak-trial.ts (엔진을 바꾸지 않고 분석 결과에서 다시 계산)
 */
import { createClient } from "@supabase/supabase-js";
import { parseNamingParams } from "@/lib/naming/params";
import { DEFAULT_PRIORITIES, firstSoundKey, rankByPriorities } from "@/lib/naming/priorities";
import { DRAFT_NAME_SOUNDS } from "@/lib/naming/name-sounds";
import type { NameGroup } from "@/lib/naming/recommend";
import { SCORE_WEIGHTS, sajuCharScore, SAJU_CHAR_SCORE } from "@/lib/naming/score";
import { DISPLAY_LIMIT, runNaming } from "@/lib/naming/service";
import type { Element, Grade, NamingAnalysis } from "@/lib/naming/types";
import { BOYS, GIRLS } from "./common-names";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
// 실험 지점: PRON_F(발음오행 감점 비율, 예 0.5) · PRON_MODE=B(상극만 감점: 0곳 100 · 1곳 80 · 2곳 이상 40)
// · SAJU_H/SAJU_N(용신 글자가 있을 때 희신·중립 글자 점수, 예 0.8/0.6) · SAJU_MODE=C(용신 하나 + 기신 없음이면 100)
const MODE =
  [
    process.env.PRON_F ? `B×${process.env.PRON_F}` : process.env.PRON_MODE === "B" ? "B(상극만)" : "",
    process.env.SAJU_H ? `C(${process.env.SAJU_H}/${process.env.SAJU_N})` : process.env.SAJU_MODE === "C" ? "C(전부)" : "",
  ]
    .filter(Boolean).join("+") || "지금";
const SURNAMES: [string, string][] = [["김", "金"], ["이", "李"], ["박", "朴"], ["최", "崔"], ["정", "鄭"]];
const BIRTHS = [
  ["2024-11-20", "09:33", "jeju"], ["2024-11-20", "09:33", "seoul"], ["2024-05-10", "07:28", "seoul"],
  ["2023-01-05", "23:25", "seoul"], ["1987-07-15", "14:20", "seoul"], ["2022-08-08", "12:10", "seoul"],
  ["2025-12-24", "18:50", "seoul"], ["2024-09-02", "06:58", "seoul"], ["2025-03-03", "03:15", "seoul"],
  ["2025-07-21", "16:40", "seoul"],
];
const FOCUS = ["서윤", "하윤", "하은", "하준", "은우", "서연", "도윤"];
const KEYS = ["saju", "suri", "pronunciation", "resource"] as const;
type Key = (typeof KEYS)[number];
const LABEL: Record<Key, string> = { saju: "사주 보완", suri: "수리", pronunciation: "발음오행", resource: "자원오행" };
const r1 = (n: number) => Math.round(n * 10) / 10;
const COMMON = { female: new Set(GIRLS), male: new Set(BOYS) };
const LISTED = new Set(DRAFT_NAME_SOUNDS.sounds().map((s) => s.sound));

function lost(a: NamingAnalysis): Record<Key, number> {
  const w = KEYS.filter((k) => a.breakdown[k] !== null).reduce((s, k) => s + SCORE_WEIGHTS[k], 0);
  const out = { saju: 0, suri: 0, pronunciation: 0, resource: 0 };
  for (const k of KEYS) {
    const s = a.breakdown[k];
    if (s !== null) out[k] = (SCORE_WEIGHTS[k] / w) * (100 - s);
  }
  return out;
}

/** C안 규칙의 사주 보완 (용신 글자가 하나 있고 기신 글자가 없으면 100). 지금 엔진 결과에서 계산 */
function cSaju(a: NamingAnalysis, given: { element: Element | null }[], y: { yongsin: Element; huisin: Element; gisin: Element }) {
  if (a.breakdown.saju === null) return null;
  const per = given.map((c) => sajuCharScore(c.element, { needed: y.yongsin, favorable: y.huisin, unfavorable: y.gisin }) ?? SAJU_CHAR_SCORE.neutral);
  if (a.resource?.arrangement === "통관") per[0] = Math.max(per[0], SAJU_CHAR_SCORE.tonggwan);
  return per.includes(1) && !per.includes(0) ? 100 : a.breakdown.saju;
}

const screen = (gs: NameGroup[]) =>
  rankByPriorities(
    gs.map((g) => ({ g, metrics: { baseScore: g.options[0].baseScore, globalScore: g.options[0].globalScore, births: null, everListed: null } })),
    DEFAULT_PRIORITIES, false, DISPLAY_LIMIT, (i) => !!i.g.soundFill, (i) => firstSoundKey([...i.g.hangul][0])
  ).map(({ item }) => item.g).slice(0, DISPLAY_LIMIT);

/** 두 성별 합계 (한 줄 요약용) */
const all = { gr: { S: 0, A: 0, B: 0, C: 0 } as Record<Grade, number>, n15: 0, common15: 0, unlisted15: 0, focusN: 0, focusB: 0 };
const focusGrades = new Map<string, Record<Grade, number>>();
/** HANJA=1: 화면 상위 30 대표 조합에 나온 한자 빈도 (흔한 이름 카드 기준) */
const HANJA = process.env.HANJA === "1";
const hanjaFreq = new Map<string, { n: number; hun: string | null; suit: string; element: string | null; names: Map<string, number> }>();

(async () => {
  console.log(`# 추천받기 — ${MODE}`);
  for (const gender of ["female", "male"] as const) {
    const gr: Record<Grade, number> = { S: 0, A: 0, B: 0, C: 0 };
    const sum = { saju: 0, suri: 0, pronunciation: 0, resource: 0 };
    let n30 = 0, tot = 0, common15 = 0, unlisted15 = 0, n15 = 0, cGain = 0, cHits = 0, sajuFull = 0;
    const focus = new Map<string, { n: number; rank: number; loss: Record<Key, number>; total: number }>();
    const unlistedEx = new Map<string, number>();
    for (const [s, sh] of SURNAMES) for (const [date, time, place] of BIRTHS) {
      const p = parseNamingParams({ surname: s, sh, date, time, place, gender });
      if (!p.ok) throw p.error;
      const r = await runNaming(supabase, p.value);
      if (!r.ok) throw r.error;
      for (const g of r.groups.slice(0, DISPLAY_LIMIT)) { gr[g.options[0].analysis.grade]++; all.gr[g.options[0].analysis.grade]++; }
      const top = screen(r.groups);
      top.forEach((g, i) => {
        const o = g.options[0];
        const a = o.analysis;
        const l = lost(a);
        for (const k of KEYS) sum[k] += l[k];
        n30++; tot += a.totalScore;
        if (a.breakdown.saju === 100) sajuFull++;
        const cs = cSaju(a, o.givenName, r.saju.yongsin);
        if (cs !== null && cs !== a.breakdown.saju) { cHits++; cGain += ((cs - a.breakdown.saju!) * SCORE_WEIGHTS.saju) / 100; }
        if (i < 15) {
          n15++; all.n15++;
          if (COMMON[gender].has(g.hangul)) { common15++; all.common15++; }
          if (!LISTED.has(g.hangul)) { unlisted15++; all.unlisted15++; unlistedEx.set(g.hangul, (unlistedEx.get(g.hangul) ?? 0) + 1); }
        }
        if (HANJA && COMMON[gender].has(g.hangul)) {
          for (const c of o.givenName) {
            const key = `${c.hanja}(${c.eum})`;
            const h = hanjaFreq.get(key) ?? { n: 0, hun: c.hun, suit: c.suitability, element: c.element, names: new Map() };
            h.n++; h.names.set(g.hangul, (h.names.get(g.hangul) ?? 0) + 1);
            hanjaFreq.set(key, h);
          }
        }
        if (FOCUS.includes(g.hangul)) {
          const fg = focusGrades.get(g.hangul) ?? { S: 0, A: 0, B: 0, C: 0 };
          fg[a.grade]++; focusGrades.set(g.hangul, fg);
          all.focusN++; if (a.grade !== "C") all.focusB++;
          const f = focus.get(g.hangul) ?? { n: 0, rank: 0, loss: { saju: 0, suri: 0, pronunciation: 0, resource: 0 }, total: 0 };
          f.n++; f.rank += i + 1; f.total += a.totalScore;
          for (const k of KEYS) f.loss[k] += l[k];
          focus.set(g.hangul, f);
        }
      });
    }
    const g = gender === "female" ? "여" : "남";
    console.log(`\n## ${g}`);
    console.log(`상위 30 등급 (서버 순서): S${gr.S} A${gr.A} B${gr.B} C${gr.C}`);
    console.log(`화면 상위 15: 흔한 이름 ${r1((common15 / n15) * 100)}% · 소리 목록 밖 ${r1((unlisted15 / n15) * 100)}% (${[...unlistedEx].sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k, v]) => `${k}${v}`).join(" ")})`);
    console.log(`화면 상위 30 깎인 점수: 평균 총점 ${r1(tot / n30)} · ` + KEYS.map((k) => `${LABEL[k]} −${r1(sum[k] / n30)}`).join(" · "));
    console.log(`사주 보완 만점(100) ${r1((sajuFull / n30) * 100)}% · "두 글자 모두" 규칙으로 깎인 이름 ${r1((cHits / n30) * 100)}%, 그 이름들 평균 −${cHits ? r1(cGain / cHits) : 0}점 (전체 평균 −${r1(cGain / n30)}점)`);
    for (const name of FOCUS) {
      const f = focus.get(name);
      console.log(`  ${name}\t` + (f ? `상위 30에 ${f.n}/50번 · 평균 ${r1(f.rank / f.n)}위 · 총점 ${r1(f.total / f.n)} · ` + KEYS.map((k) => `${LABEL[k]} −${r1(f.loss[k] / f.n)}`).join(" · ") : "상위 30에 없음"));
    }
  }

  console.log(`\n## 김·이·박 여자아이 2022-02-10 10:30 서울 화면 상위 10 (·소리 목록 밖, *흔한 이름 표본)`);
  for (const [s, sh] of [["김", "金"], ["이", "李"], ["박", "朴"]] as const) {
    const p = parseNamingParams({ surname: s, sh, date: "2022-02-10", time: "10:30", place: "seoul", gender: "female" });
    if (!p.ok) throw p.error;
    const r = await runNaming(supabase, p.value);
    if (!r.ok) throw r.error;
    const line = screen(r.groups).slice(0, 10).map((g) => {
      const o = g.options[0];
      return `${LISTED.has(g.hangul) ? "" : "·"}${COMMON.female.has(g.hangul) ? "*" : ""}${g.hangul}(${o.givenName.map((c) => c.hanja).join("")}) ${o.analysis.grade}${o.analysis.totalScore}`;
    });
    console.log(`${s}\t${line.join(" · ")}`);
  }

  const n = all.gr.S + all.gr.A + all.gr.B + all.gr.C;
  const pc = (x: number, d: number) => `${r1((x / d) * 100)}%`;
  console.log(`\n## 따로 볼 이름 등급 (화면 상위 30, 여·남 합)`);
  for (const name of FOCUS) {
    const fg = focusGrades.get(name);
    console.log(`  ${name}\t${fg ? `S${fg.S} A${fg.A} B${fg.B} C${fg.C}` : "-"}`);
  }
  console.log(`SUMMARY\t${MODE}\tS ${pc(all.gr.S, n)} · A ${pc(all.gr.A, n)} · B ${pc(all.gr.B, n)} · C ${pc(all.gr.C, n)}\t흔한 이름 상위15 ${pc(all.common15, all.n15)}\t목록 밖 상위15 ${pc(all.unlisted15, all.n15)}\t7개 이름 B 이상 ${pc(all.focusB, all.focusN)} (${all.focusB}/${all.focusN})`);

  if (HANJA) {
    console.log(`\n## 흔한 이름 카드의 대표 한자 빈도 상위 40 (화면 상위 30, 여·남 100건)`);
    for (const [k, h] of [...hanjaFreq].sort((x, y) => y[1].n - x[1].n).slice(0, 40)) {
      const names = [...h.names].sort((x, y) => y[1] - x[1]).slice(0, 5).map(([nm, c]) => `${nm}${c}`).join(" ");
      console.log(`${k}\t${h.n}\t${h.hun ?? "(훈 없음)"}\t${h.suit}\t${h.element ?? "-"}\t${names}`);
    }
  }
})();
