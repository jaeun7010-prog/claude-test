import { GIRLS, BOYS } from "./common-names";
const names = [...new Set([...GIRLS, ...BOYS])].filter((n) => [...n].length === 2);
const first = new Map<string, number>(), last = new Map<string, number>();
for (const n of names) { const [a, b] = [...n]; first.set(a, (first.get(a) ?? 0) + 1); last.set(b, (last.get(b) ?? 0) + 1); }
const syl = [...new Set([...first.keys(), ...last.keys()])];
const rows = syl.map((s) => ({ s, f: first.get(s) ?? 0, l: last.get(s) ?? 0 })).map((r) => ({ ...r, t: r.f + r.l, share: r.f / (r.f + r.l) }));
console.log(`두 글자 이름 ${names.length}개`);
const focus = process.argv.slice(2);
const show = rows.filter((r) => r.t >= 3 || focus.includes(r.s)).sort((a, b) => a.share - b.share || b.t - a.t);
console.log("소리\t첫 글자\t끝 글자\t첫 글자 비율");
for (const r of show) console.log(`${r.s}\t${r.f}\t${r.l}\t${Math.round(r.share * 100)}%`);
for (const s of focus) if (!rows.find((r) => r.s === s)) console.log(`${s}\t0\t0\t표본에 없음`);
