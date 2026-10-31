/** 무료 오행 칸 기준(가중치 비율 0 / 15 미만 / 15~29 / 30 이상) 분포와, 용신·희신이 "많음"으로 보이는 비율. seed 20261017, 5,000개 */
import { analyzeSaju } from "@/lib/saju";
import { parseNamingParams } from "@/lib/naming/params";
let seed = 20261017;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const lv = (p: number) => (p === 0 ? "없음" : p < 15 ? "부족" : p < 30 ? "보통" : "많음");
const all: Record<string, number> = {}, y: Record<string, number> = {}, h: Record<string, number> = {};
let exactZero = 0, roundZero = 0, same = 0, cells = 0;
const N = 5000;
for (let i = 0; i < N; i++) {
  const d = `${2015 + Math.floor(rnd() * 12)}-${String(1 + Math.floor(rnd() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rnd() * 28)).padStart(2, "0")}`;
  const t = `${String(Math.floor(rnd() * 24)).padStart(2, "0")}:${String(Math.floor(rnd() * 60)).padStart(2, "0")}`;
  const r = parseNamingParams({ surname: "김", sh: "金", date: d, time: t, place: "seoul", gender: "male" });
  if (!r.ok) continue;
  const { yongsin: s } = analyzeSaju(r.value.birth);
  const tot = Object.values(s.scores).reduce((a, b) => a + b, 0);
  for (const [e, v] of Object.entries(s.scores)) {
    const p = Math.round((v / tot) * 100);
    cells++; all[lv(p)] = (all[lv(p)] ?? 0) + 1;
    if (v === 0) exactZero++;
    if (p === 0) roundZero++;
    if (e === s.yongsin) y[lv(p)] = (y[lv(p)] ?? 0) + 1;
    if (e === s.huisin) h[lv(p)] = (h[lv(p)] ?? 0) + 1;
  }
  if (s.yongsin === s.huisin) same++;
}
console.log({ cells, all, yongsin: y, huisin: h, exactZero, roundZero, same });
