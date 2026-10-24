/**
 * 셀프 작명 점검: npx tsx --env-file=.env.local scripts/self-naming-check.ts [--detail]
 * 흔한 이름 20개(여 10 · 남 10) × 성씨 5개 × 테스트 사주 10개(grade-distribution.ts와 같음)로
 *  - 자리별 후보 한자 수(보이는 글자 / 뜻 제외로 숨김 / 성별로 뺌), 애매·어색 비율
 *  - 추천 조합 1위·TOP 3 등급 분포, "S 없음"·"A 이상 없음"·"C뿐" 비율
 *  - [최고]·[추천] 개수, 점수표 크기(JSON 바이트)
 * 와 몇 가지 특수 사례(외자·복성·부모 성 함께 쓰기)를 출력한다. --detail이면 이름·사주별 TOP 3도 출력한다.
 */
import { createClient } from "@supabase/supabase-js";
import { analyzeSaju } from "@/lib/saju";
import { fetchByEum, fetchSurname } from "@/lib/naming/hanja-repo";
import { parseNamingParams } from "@/lib/naming/params";
import type { NameHanja } from "@/lib/naming/recommend";
import { buildSelfTable, runSelfNaming, selfSlotOf } from "@/lib/naming/self";
import { rankSlot, selfNotice, topCombos, type SelfTable } from "@/lib/naming/self-rank";
import { withSurnameElements } from "@/lib/naming/surnames";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const DETAIL = process.argv.includes("--detail");
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

const pct = (n: number, d: number) => `${((n / d) * 100).toFixed(1)}%`;
const hanjaOf = (t: SelfTable, picks: number[]) => picks.map((i, s) => t.slots[s].chars[i].hanja).join("");

(async () => {
  const byEum = new Map<string, NameHanja[]>();
  const rowsOf = async (eum: string) => {
    if (!byEum.has(eum)) byEum.set(eum, await fetchByEum(supabase, eum));
    return byEum.get(eum)!;
  };
  const surnames = new Map<string, NameHanja[]>();
  for (const [s, sh] of SURNAMES) surnames.set(s, withSurnameElements((await fetchSurname(supabase, [sh], [s]))!));

  // 자리별 후보 수 (성별에 따라 다름)
  console.log("## 자리별 후보 한자 (보임 / 뜻 제외 숨김 / 성별로 뺌 · 그중 애매 / 어색)");
  const syllables = new Map<string, Set<"female" | "male">>();
  for (const [n, g] of NAMES) for (const e of n) syllables.set(e, (syllables.get(e) ?? new Set()).add(g));
  for (const [eum, genders] of syllables) {
    for (const g of genders) {
      const { slot } = selfSlotOf(eum, await rowsOf(eum), g);
      const ob = slot.chars.filter((c) => c.suitability === "obscure").length;
      const aw = slot.chars.filter((c) => c.suitability === "awkward").length;
      console.log(`${eum}(${g === "female" ? "여" : "남"})\t${slot.chars.length} / ${slot.hiddenMeaning} / ${slot.hiddenGender}\t애매 ${ob} 어색 ${aw}`);
    }
  }

  const top1 = { S: 0, A: 0, B: 0, C: 0 };
  const top3 = { S: 0, A: 0, B: 0, C: 0 };
  const tone = { good: 0, fair: 0, weak: 0 };
  let runs = 0, noS = 0, noA = 0, best0 = 0, rec = 0, bytes = 0, maxBytes = 0, ms = 0, top3Eligible = 0;
  const perName: string[] = [];
  for (const [name, gender] of NAMES) {
    const nameTop1 = { S: 0, A: 0, B: 0, C: 0 };
    const firstHanja = new Map<string, number>();
    for (const [s, sh] of SURNAMES) for (const [date, time, place] of BIRTHS) {
      const p = parseNamingParams({ surname: s, sh, date, time, place, gender });
      if (!p.ok) throw p.error;
      const saju = analyzeSaju(p.value.birth);
      const built = await Promise.all([...name].map(async (e) => selfSlotOf(e, await rowsOf(e), gender)));
      const t0 = performance.now();
      const table = buildSelfTable({
        surname: surnames.get(s)!, prefix: [], saju: saju.yongsin,
        slotChars: built.map((b) => b.chars), slots: built.map((b) => b.slot),
      });
      ms += performance.now() - t0;
      const size = JSON.stringify(table).length;
      bytes += size; maxBytes = Math.max(maxBytes, size);
      const tops = topCombos(table);
      runs++;
      top1[tops[0].score.grade]++; nameTop1[tops[0].score.grade]++;
      for (const c of tops) top3[c.score.grade]++;
      top3Eligible += tops.filter((c) => c.picks.every((i, sl) => ["good", "normal"].includes(table.slots[sl].chars[i].suitability))).length;
      if (tops[0].score.grade !== "S") noS++;
      if (!["S", "A"].includes(tops[0].score.grade)) noA++;
      const notice = selfNotice(table)!;
      tone[notice.tone]++;
      const r0 = rankSlot(table, 0, [null, null]);
      if (!r0.some((r) => r.badge === "최고")) best0++;
      rec += r0.filter((r) => r.badge === "추천").length;
      const h = hanjaOf(table, tops[0].picks);
      firstHanja.set(h, (firstHanja.get(h) ?? 0) + 1);
      if (DETAIL)
        console.log(`${s}${name} ${date} ${time} ${place} 용신${saju.yongsin.yongsin}\t` +
          tops.map((c) => `${hanjaOf(table, c.picks)} ${c.score.grade}${c.score.totalScore}`).join(" · ") + `\t${notice.text}`);
    }
    const common = [...firstHanja].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([h, n]) => `${h}×${n}`).join(" ");
    perName.push(`${name}(${gender === "female" ? "여" : "남"})\t1위 S${nameTop1.S} A${nameTop1.A} B${nameTop1.B} C${nameTop1.C}\t자주 1위: ${common}`);
  }

  console.log(`\n## 이름별 추천 조합 1위 등급 (성 5 × 사주 10 = 50건)`);
  console.log(perName.join("\n"));
  console.log(`\n## 합계 (${runs}건)`);
  console.log(`1위 등급: S${top1.S} A${top1.A} B${top1.B} C${top1.C}`);
  console.log(`TOP 3 등급: S${top3.S} A${top3.A} B${top3.B} C${top3.C} (애매·어색 없는 조합 ${pct(top3Eligible, runs * 3)})`);
  console.log(`S등급 조합 없음 ${pct(noS, runs)} · A 이상 없음 ${pct(noA, runs)} · 안내 good ${tone.good} fair ${tone.fair} weak ${tone.weak}`);
  console.log(`첫 자리 [최고] 없음 ${best0}건 · [추천] 평균 ${(rec / runs).toFixed(2)}개`);
  console.log(`점수표 JSON 평균 ${(bytes / runs / 1024).toFixed(0)}KB · 최대 ${(maxBytes / 1024).toFixed(0)}KB · 계산 평균 ${(ms / runs).toFixed(1)}ms`);

  // 특수 사례: runSelfNaming(서버 경로 전체)
  console.log(`\n## 특수 사례 (여자아이 2024-05-10 07:28 서울)`);
  const cases: [Record<string, string>, string][] = [
    [{ surname: "김", sh: "金" }, "윤"],
    [{ surname: "김", sh: "金" }, "현"],
    [{ surname: "남궁", sh: "南宮" }, "서윤"],
    [{ surname: "김", sh: "金", ps: "박", psh: "朴" }, "서윤"],
    [{ surname: "이", sh: "李", ps: "남궁", psh: "南宮" }, "서윤"],
    [{ surname: "김", sh: "金", ps: "박", psh: "朴" }, "박하"],
    [{ surname: "김", sh: "金" }, "서윤아"],
    [{ surname: "김", sh: "金" }, "똠"],
  ];
  for (const [base, given] of cases) {
    const p = parseNamingParams({ ...base, date: "2024-05-10", time: "07:28", place: "seoul", gender: "female" });
    if (!p.ok) throw p.error;
    const r = await runSelfNaming(supabase, p.value, given);
    const label = `${base.surname}${base.ps ?? ""}${given}`;
    if (!r.ok) { console.log(`${label}\t오류: ${r.error}`); continue; }
    const t = r.table;
    const tops = topCombos(t);
    const legal = tops[0].score.legal ? ` (법적 기준 ${tops[0].score.legal.grade}${tops[0].score.legal.totalScore})` : "";
    const badges = t.slots.map((_, i) => rankSlot(t, i, t.slots.map(() => null)).slice(0, 6)
      .map((x) => `${x.char.hanja}${x.badge ? `[${x.badge}]` : ""}`).join(" ")).join(" / ");
    console.log(`${label}\t후보 ${t.slots.map((s) => s.chars.length).join("×")}\t` +
      tops.map((c) => `${hanjaOf(t, c.picks)} ${c.score.grade}${c.score.totalScore}`).join(" · ") + legal +
      `\n\t${selfNotice(t)!.text}\n\t${badges}`);
  }
  // 첫 글자를 고르면 둘째 자리가 다시 정렬되는지
  const p = parseNamingParams({ surname: "김", sh: "金", date: "2024-05-10", time: "07:28", place: "seoul", gender: "female" });
  if (!p.ok) throw p.error;
  const r = await runSelfNaming(supabase, p.value, "서윤");
  if (r.ok) {
    const t = r.table;
    const show = (picks: (number | null)[]) => rankSlot(t, 1, picks).slice(0, 6)
      .map((x) => `${x.char.hanja}${x.badge ? `[${x.badge}]` : ""} ${x.score?.grade}${x.score?.totalScore}`).join(" · ");
    console.log(`\n## 김서윤: 둘째 자리 정렬`);
    console.log(`안 고름\t${show([null, null])}`);
    for (const h of ["瑞", "序", "舒"]) {
      const i = t.slots[0].chars.findIndex((c) => c.hanja === h);
      if (i >= 0) console.log(`${h} 고름\t${show([i, null])}`);
    }
  }
})();
