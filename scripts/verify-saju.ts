/**
 * 사주 계산 검증 스크립트: npx tsx scripts/verify-saju.ts
 * 1) 공표된 기준 사례, 2) lunar-javascript와의 무작위 교차 검증(UTC+8, 보정 없음)
 */
import { Solar } from "lunar-javascript";

import { calculateFourPillars } from "@/lib/saju";

let failed = 0;
const check = (label: string, actual: string, expected: string) => {
  const ok = actual === expected;
  if (!ok) failed++;
  console.log(`${ok ? "OK  " : "FAIL"} ${label}: ${actual}${ok ? "" : ` (기대값 ${expected})`}`);
};
const ko = (o: Parameters<typeof calculateFourPillars>[0]) => {
  const r = calculateFourPillars(o);
  return [r.year.ko, r.month.ko, r.day.ko, r.hour?.ko ?? "-"].join(" ");
};

// 한국천문연구원 공표 입춘: 2024-02-04 17:27 KST
check("입춘 직전", ko({ year: 2024, month: 2, day: 4, hour: 17, minute: 26, longitude: null }), "계묘 을축 무술 신유");
check("입춘 직후", ko({ year: 2024, month: 2, day: 4, hour: 17, minute: 28, longitude: null }), "갑진 병인 무술 신유");
check("2000-01-01 12:00", ko({ year: 2000, month: 1, day: 1, hour: 12, longitude: null }), "기묘 병자 무오 무오");

// 무작위 교차 검증
let seed = 20240204;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
for (const sect of [1, 2] as const) {
  let bad = 0;
  const N = 3000;
  for (let i = 0; i < N; i++) {
    const y = 1902 + Math.floor(rnd() * 196);
    const m = 1 + Math.floor(rnd() * 12);
    const d = 1 + Math.floor(rnd() * 28);
    const h = Math.floor(rnd() * 24);
    const mi = Math.floor(rnd() * 60);
    const ec = Solar.fromYmdHms(y, m, d, h, mi, 0).getLunar().getEightChar();
    ec.setSect(sect);
    const mine = calculateFourPillars({
      year: y, month: m, day: d, hour: h, minute: mi,
      timeZone: "Etc/GMT-8", longitude: null,
      lateNight: sect === 2 ? "same-day" : "next-day",
    });
    const expected = [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()].join(" ");
    const actual = [mine.year.hanja, mine.month.hanja, mine.day.hanja, mine.hour!.hanja].join(" ");
    if (expected !== actual) bad++;
  }
  if (bad) failed++;
  console.log(`${bad ? "FAIL" : "OK  "} 교차 검증 sect=${sect}: ${N}건 중 불일치 ${bad}건`);
}

process.exit(failed ? 1 : 0);
