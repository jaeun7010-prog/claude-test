import { easeScore } from "@/lib/naming/native/score";
const END = new Set("린원호율영안온우현진연");
const V = process.env.V ?? "";
(globalThis as any).__TREND_ADJ = (fixed: string, given: string, t: number) => {
  let x = t;
  if (V.includes("B")) {
    const extra = easeScore(fixed, given).penalties.filter((p) => !p.reason.startsWith("이름에 ")).reduce((s, p) => s + p.points, 0);
    x *= Math.max(0, 1 - Math.min(100, extra) / 100);
  }
  if (V.includes("C") && [...given].length === 2 && END.has([...given][0])) x *= 0.85;
  return x;
};
import("../dump-single-surname");
