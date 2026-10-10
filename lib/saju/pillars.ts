import { BRANCHES, BRANCHES_KO, STEMS, STEMS_KO } from "./constants";
import { civilToUtcMs, currentJie, ipchunUtcMs, JIE_KO, julianDayNumber } from "./calendar";

export interface BirthInput {
  year: number;
  month: number;
  day: number;
  /** 0~23. 출생시를 모르면 생략 */
  hour?: number;
  minute?: number;
  /** 출생지 IANA 시간대 (기본 Asia/Seoul) */
  timeZone?: string;
  /**
   * 출생지 경도(동경, 도). 평균태양시 보정에 사용 (기본: 서울 126.978).
   * null이면 보정하지 않고 입력한 벽시계 시각 그대로 일주·시주를 계산합니다.
   */
  longitude?: number | null;
  /**
   * 자시(23:00~24:00) 처리.
   * - "next-day": 23:00부터 다음 날 일주를 사용 (조자시/야자시 구분 없이 23시 기준, 기본값)
   * - "same-day": 23:00~24:00은 당일 일주를 유지하고 시주만 다음 날 일간으로 계산 (야자시)
   */
  lateNight?: "next-day" | "same-day";
}

export interface Pillar {
  /** 천간 index 0~9 */
  stem: number;
  /** 지지 index 0~11 */
  branch: number;
  /** 갑자 순번 0~59 */
  index: number;
  hanja: string; // 例: 戊午
  ko: string; // 例: 무오
}

export interface FourPillars {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  /** 출생시를 모르면 null */
  hour: Pillar | null;
  meta: {
    /** 월주를 결정한 절기 */
    monthTerm: { name: string; ko: string; utcMs: number };
    /** 일주·시주 계산에 사용한 지방 평균태양시 (UTC 필드로 읽을 것) */
    localSolarDate: Date;
    /** 사주상 연도 (입춘 기준) */
    sajuYear: number;
  };
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

function makePillar(stem: number, branch: number): Pillar {
  // 60갑자 순번: stem ≡ i (mod 10), branch ≡ i (mod 12)
  let index = -1;
  for (let i = 0; i < 60; i++) {
    if (i % 10 === stem && i % 12 === branch) {
      index = i;
      break;
    }
  }
  if (index < 0) throw new Error(`유효하지 않은 간지 조합: ${stem}/${branch}`);
  return {
    stem,
    branch,
    index,
    hanja: STEMS[stem] + BRANCHES[branch],
    ko: STEMS_KO[stem] + BRANCHES_KO[branch],
  };
}

const fromIndex = (i: number) => makePillar(mod(i, 10), mod(i, 12));

export function calculateFourPillars(input: BirthInput): FourPillars {
  const {
    year,
    month,
    day,
    hour,
    minute = 0,
    timeZone = "Asia/Seoul",
    longitude = 126.978,
    lateNight = "next-day",
  } = input;

  if (year < 1901 || year > 2099) throw new RangeError("지원 범위는 1901~2099년입니다.");
  const hasHour = hour !== undefined;
  const civil = { year, month, day, hour: hour ?? 12, minute: hasHour ? minute : 0 };

  const utcMs = civilToUtcMs(civil, timeZone);

  // --- 연주: 입춘 기준 ---
  const birthYearUtc = new Date(utcMs).getUTCFullYear();
  const sajuYear = utcMs < ipchunUtcMs(birthYearUtc) ? birthYearUtc - 1 : birthYearUtc;
  const yearPillar = fromIndex(sajuYear - 4);

  // --- 월주: 12절 기준 월지 + 오호둔 ---
  const { current } = currentJie(utcMs);
  const monthBranch = current.branch;
  const tigerStem = ((yearPillar.stem % 5) * 2 + 2) % 10; // 寅月의 천간
  const monthStem = mod(tigerStem + mod(monthBranch - 2, 12), 10);
  const monthPillar = makePillar(monthStem, monthBranch);

  // --- 일주·시주: 지방 평균태양시 기준 ---
  let local: Date;
  if (longitude === null) {
    local = new Date(Date.UTC(civil.year, civil.month - 1, civil.day, civil.hour, civil.minute));
  } else if (!hasHour) {
    // 시각을 모르면 날짜 경계 보정은 하지 않고 입력한 날짜 그대로 사용
    local = new Date(Date.UTC(civil.year, civil.month - 1, civil.day, 12, 0));
  } else {
    local = new Date(utcMs + longitude * 4 * 60_000);
  }

  const localHour = local.getUTCHours() + local.getUTCMinutes() / 60;
  let dayDate = local;
  if (hasHour && localHour >= 23 && lateNight === "next-day") {
    dayDate = new Date(local.getTime() + 86_400_000);
  }
  const jdn = julianDayNumber(
    dayDate.getUTCFullYear(),
    dayDate.getUTCMonth() + 1,
    dayDate.getUTCDate()
  );
  const dayPillar = fromIndex(jdn + 49); // 2000-01-01(JDN 2451545) = 戊午(54)

  // 야자시(same-day): 일주는 당일, 시주(23~24시 子時)는 다음 날 일간 기준으로 계산
  const hourDayStem =
    hasHour && localHour >= 23 && lateNight === "same-day"
      ? fromIndex(jdn + 50).stem
      : dayPillar.stem;

  let hourPillar: Pillar | null = null;
  if (hasHour) {
    const hourBranch = Math.floor((localHour + 1) / 2) % 12;
    const ziStem = (hourDayStem % 5) * 2; // 子時의 천간 (오자둔)
    hourPillar = makePillar((ziStem + hourBranch) % 10, hourBranch);
  }

  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
    meta: {
      monthTerm: { name: current.name, ko: JIE_KO[current.name], utcMs: current.utcMs },
      localSolarDate: local,
      sajuYear,
    },
  };
}
