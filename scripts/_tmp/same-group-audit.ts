// 뜻 묶음이 같은 두 글자 조합 전체의 문장과 어느 규칙으로 만들어졌는지 (겹침·뜻 빠짐 찾기)
import { nameMeaningOf } from "../../lib/naming/name-meaning";
import { NAME_MEANING } from "../../lib/naming/name-meaning-table";
const split = (p: string) => { const i = p.indexOf("처럼 "); return i < 0 ? { s: null as string | null, p } : { s: p.slice(0, i), p: p.slice(i + 3) }; };
const last = (s: string) => s.split(" ").pop()!;
const byGroup: Record<string, string[]> = {};
for (const [k, v] of Object.entries(NAME_MEANING)) (byGroup[v.group] ??= []).push(k);
const seen = new Set<string>();
for (const [g, ks] of Object.entries(byGroup)) for (const a of ks) for (const b of ks) {
  if (a === b || a.split("|")[0] === b.split("|")[0]) continue;
  const A = NAME_MEANING[a], B = NAME_MEANING[b];
  const ra = split(A.rel), rb = split(B.rel);
  let kind: string;
  if (A.rel === B.rel) kind = "같은 문구";
  else if (ra.s && rb.s) kind = last(ra.s) === last(rb.s) ? (ra.s === rb.s ? "같은 비유" : "비유 하나만(수식어 빠짐)") : "비유 합침";
  else if ((rb.s && !ra.s && A.rel.endsWith(rb.p)) || (ra.s && !rb.s && B.rel.endsWith(ra.p))) kind = "비유 앞에";
  else if (last(ra.p) === last(rb.p)) kind = "긴 문구 하나";
  else kind = "보통 틀(겹침 가능)";
  const chars = [a, b].map((k) => { const [hanja, eum] = k.split("|"); return { hanja, eum, hun: null }; });
  const sen = nameMeaningOf(chars)?.sentence.replace(" 사람으로 자라길 바라는 뜻", "") ?? "(없음)";
  const id = [a, b].sort().join("+") + kind;
  console.log([g, kind, a.split("|")[0] + b.split("|")[0], A.rel, B.rel, sen].join("\t"));
}
