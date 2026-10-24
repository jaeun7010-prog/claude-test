/**
 * 셀프 작명 점수표(SelfTable)를 브라우저로 보낼 때 줄이는 형식.
 * 조합마다 객체 대신 숫자 배열 하나로 보내 크기를 줄인다 (객체 JSON 평균 300KB · 최대 725KB).
 * 점수는 100을 곱한 정수로 보낸다 (소수 둘째 자리까지면 정렬이 서버와 같다). 엔진을 가져오지 않아 브라우저에서도 쓴다.
 */
import type { SelfScore, SelfSlot, SelfTable } from "./self-rank";
import type { Grade } from "./types";

const GRADES: readonly Grade[] = ["S", "A", "B", "C"];

/**
 * 조합 하나: [총점, 등급, 사주 보완, 수리, 발음오행, 자원오행, 기본 순위 점수, 원, 형, 이, 정, 길흉 비트, (법적 총점, 법적 등급)].
 * 점수는 ×100 정수, 없는 항목(null)은 -1. 길흉 비트는 원격부터 1·2·4·8. 같은 한자 조합은 0
 */
type PackedScore = number[] | 0;

export interface PackedSelfTable {
  slots: SelfSlot[];
  scores: PackedScore[];
  pronunciation: number;
}

const enc = (v: number | null) => (v === null ? -1 : Math.round(v * 100));
const dec = (v: number) => (v < 0 ? null : v / 100);

export function packSelfTable(t: SelfTable): PackedSelfTable {
  return {
    slots: t.slots,
    pronunciation: t.pronunciation.score,
    scores: t.scores.map((s) => {
      if (!s) return 0;
      const b = s.breakdown;
      const row = [
        enc(s.totalScore),
        GRADES.indexOf(s.grade),
        enc(b.saju),
        enc(b.suri),
        enc(b.pronunciation),
        enc(b.resource),
        enc(s.baseScore),
        ...s.gyeok.map((g) => g.suri),
        s.gyeok.reduce((bits, g, i) => bits | (g.lucky ? 1 << i : 0), 0),
      ];
      if (s.legal) row.push(enc(s.legal.totalScore), GRADES.indexOf(s.legal.grade));
      return row;
    }),
  };
}

export function unpackSelfTable(p: PackedSelfTable): SelfTable {
  return {
    slots: p.slots,
    pronunciation: { score: p.pronunciation },
    scores: p.scores.map((r): SelfScore | null => {
      if (!r) return null;
      return {
        totalScore: dec(r[0])!,
        grade: GRADES[r[1]],
        breakdown: { saju: dec(r[2]), suri: dec(r[3])!, pronunciation: dec(r[4])!, resource: dec(r[5]) },
        baseScore: dec(r[6])!,
        gyeok: [r[7], r[8], r[9], r[10]].map((suri, i) => ({ suri, lucky: (r[11] & (1 << i)) !== 0 })),
        ...(r.length > 12 ? { legal: { totalScore: dec(r[12])!, grade: GRADES[r[13]] } } : {}),
      };
    }),
  };
}
