/**
 * 순우리말 입력 조건 점검: npx tsx --env-file=.env.local scripts/native-conditions.ts
 * 성(단성·복성) × 부모 성 함께 쓰기 × 성별 × 글자 수 × 돌림자·글로벌·젠더 뉴트럴 조합마다
 * 결과 수, 안내 문구, 조건별 제외 수를 표로 출력한다. 부모 성 5자 초과 제외는 가짜 4자 이름으로도 확인한다.
 */
import { createClient } from "@supabase/supabase-js";
import { NATIVE_NAMES, type NativeName } from "@/lib/naming/native-names";
import { buildNativeCandidates, runNativeNaming } from "@/lib/naming/native/service";
import { parseNamingParams } from "@/lib/naming/params";
import { analyzeSaju } from "@/lib/saju";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { persistSession: false },
});
const BIRTH = { date: "2024-11-20", time: "09:33", place: "seoul" };

type Raw = Record<string, string>;
const CASES: [string, Raw][] = [];
for (const [sLabel, s] of [["김", { surname: "김", sh: "金" }], ["남궁", { surname: "남궁", sh: "南宮" }]] as const)
  for (const [pLabel, ps] of [["-", {}], ["+박", { ps: "박", psh: "朴" }], ["+남궁", { ps: "남궁", psh: "南宮" }]] as const) {
    if (sLabel === "남궁" && pLabel === "+남궁") continue;
    for (const gender of ["male", "female", "neutral"])
      for (const len of ["1", "2", "any"])
        CASES.push([`${sLabel}${pLabel} ${gender} len=${len}`, { ...s, ...ps, ...BIRTH, gender, ...(len === "any" ? {} : { len }) }]);
  }
CASES.push(["김+이 neutral any (부모 성 겹침: 이레·이랑·이루·이룸)", { surname: "김", sh: "金", ps: "이", psh: "李", ...BIRTH, gender: "neutral" }]);
CASES.push(["김+한 male any (부모 성 겹침: 한결·한솔 등)", { surname: "김", sh: "金", ps: "한", psh: "韓", ...BIRTH, gender: "male" }]);
CASES.push(["김 female any 돌림자(서, 첫째)", { surname: "김", sh: "金", ...BIRTH, gender: "female", dol: "서", dolpos: "1" }]);
CASES.push(["김 female any 글로벌", { surname: "김", sh: "金", ...BIRTH, gender: "female", glob: "1" }]);
CASES.push(["김+남궁 male any 글로벌", { surname: "김", sh: "金", ps: "남궁", psh: "南宮", ...BIRTH, gender: "male", glob: "1" }]);
CASES.push(["김 neutral any 젠더 뉴트럴 (통계 조회)", { surname: "김", sh: "金", ...BIRTH, gender: "neutral", neutral: "1" }]);

const row = (label: string, r: ReturnType<typeof buildNativeCandidates>) => {
  const e = r.excluded;
  return `| ${label} | ${r.candidates.length} | ${r.notices.join(" / ") || "-"} | ${e.gender} | ${e.length} | ${e.tooLong} | ${e.repeatsPrefix} | ${e.global} | ${e.neutral} | ${r.candidates.slice(0, 3).map((c) => c.legalName).join(", ")} |`;
};

(async () => {
  console.log("| 조건 | 결과 수 | 안내 | 제외: 성별 | 글자 수 | 5자 초과 | 부모 성 겹침 | 글로벌 | 뉴트럴 | 상위 3 |");
  console.log("|---|---|---|---|---|---|---|---|---|---|");
  for (const [label, raw] of CASES) {
    const p = parseNamingParams(raw);
    if (!p.ok) {
      console.log(`| ${label} | 입력 오류: ${p.error} |`);
      continue;
    }
    const saju = analyzeSaju(p.value.birth);
    const r = p.value.neutral ? await runNativeNaming(supabase, p.value, saju) : buildNativeCandidates(p.value, saju, null);
    console.log(row(label, r));
  }

  // 5자 초과: 지금 목록은 최대 3자라 복성 부모 성(2자)과 합쳐도 5자다. 가짜 4자 이름을 넣어 걸러지는지 본다
  const fake: NativeName[] = [
    ...NATIVE_NAMES.filter((n) => n.name === "한가람" || n.name === "가람"),
    { name: "한가람솔", category: "coined", gender: "neutral", meaningGrade: "good", meaning: "(검증용 가짜 이름)" },
  ];
  for (const [label, raw] of [
    ["가짜 4자 + 부모 성 없음", { surname: "김", sh: "金", ...BIRTH, gender: "neutral" }],
    ["가짜 4자 + 부모 성 박(1자)", { surname: "김", sh: "金", ps: "박", psh: "朴", ...BIRTH, gender: "neutral" }],
    ["가짜 4자 + 부모 성 남궁(2자)", { surname: "김", sh: "金", ps: "남궁", psh: "南宮", ...BIRTH, gender: "neutral" }],
  ] as const) {
    const p = parseNamingParams(raw as Raw);
    if (!p.ok) throw p.error;
    const saju = analyzeSaju(p.value.birth);
    console.log(row(`${label} (한가람·가람·한가람솔)`, { ...buildNativeCandidates({ ...p.value, length: "any" }, saju, null, fake) }));
  }
})();
