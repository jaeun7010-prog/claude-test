// 순우리말 저장 형식 확인: saveNativeName 과 같은 값으로 행을 만들어 readSaved 로 읽는다
import { analyzeSaju } from "@/lib/saju";
import { NATIVE_NAMES } from "@/lib/naming/native-names";
import { buildNativeCandidates } from "@/lib/naming/native/service";
import { parseNamingParams } from "@/lib/naming/params";
import { readSaved, sajuSummaryOf, savedQueryOf, savedResultHref } from "@/lib/naming/saved";

for (const extra of ["", "&ps=박&psh=朴"]) {
  const qs = `surname=김&sh=金&date=2022-02-10&time=10:30&gender=female&place=seoul${extra}`;
  const parsed = parseNamingParams(Object.fromEntries(new URLSearchParams(qs)));
  if (!parsed.ok) throw new Error(parsed.error);
  const p = parsed.value;
  const saju = analyzeSaju(p.birth);
  const c = buildNativeCandidates(p, saju, null, [NATIVE_NAMES.find((n) => n.name === "하늘")!]).candidates[0];
  const row = {
    id: "00000000-0000-0000-0000-000000000000", surname: p.surname, surname_hanja: p.surnameHanja,
    given_name: c.legalName, given_name_hanja: null, total_score: null, is_favorite: false,
    created_at: new Date().toISOString(), birth_datetime: null, gender: p.gender,
    analysis: JSON.parse(JSON.stringify({ native: { name: c.name, legalName: c.legalName, score: c.score, globalScore: c.globalScore }, saju: sajuSummaryOf(p, saju) })),
    filters: { qs: savedQueryOf(p), nameKind: "native", parentSurname: p.parentSurname },
  };
  const s = readSaved(row);
  console.log(s.kind, s.surname + s.given, s.native?.score.total, "grade", s.grade, "analysis", s.analysis, "→", savedResultHref(s));
}
// 예전 한자 저장분 (nameKind 없음)
const old = readSaved({
  id: "x", surname: "김", surname_hanja: "金", given_name: "서윤", given_name_hanja: "瑞允", total_score: 88.2,
  is_favorite: false, created_at: "2026-10-01", birth_datetime: null, gender: "female",
  analysis: {}, filters: { qs: "surname=김&sh=金&date=2022-02-10&gender=female&place=seoul" },
});
console.log(old.kind, old.native, old.grade, savedResultHref(old));
