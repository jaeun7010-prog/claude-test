import { Solar } from "lunar-javascript";

/** 시간대 정보를 반영해 로컬 벽시계 시각을 UTC 시각(ms)으로 변환 */
const offsetFmtCache = new Map<string, Intl.DateTimeFormat>();

function tzOffsetMinutes(timeZone: string, utcMs: number): number {
  let fmt = offsetFmtCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
    });
    offsetFmtCache.set(timeZone, fmt);
  }
  const name = fmt.formatToParts(new Date(utcMs)).find((p) => p.type === "timeZoneName")?.value;
  const m = name?.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0; // "GMT" (UTC)
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3]));
}

/**
 * 해당 시간대의 벽시계 시각 → UTC ms.
 * 한국의 표준시 변경(1908/1912/1954/1961)과 서머타임(1948~51, 55~60, 87~88)은
 * IANA tz 데이터(Intl)를 통해 자동 반영됩니다.
 */
export function civilToUtcMs(
  fields: { year: number; month: number; day: number; hour: number; minute: number },
  timeZone: string
): number {
  const asUtc = Date.UTC(fields.year, fields.month - 1, fields.day, fields.hour, fields.minute);
  // 오프셋이 시각에 따라 바뀌므로 두 번 수렴시킨다
  let guess = asUtc - tzOffsetMinutes(timeZone, asUtc) * 60_000;
  guess = asUtc - tzOffsetMinutes(timeZone, guess) * 60_000;
  return guess;
}

/** 12절(節)의 이름 → 월지 index (子=0 …). 한 달의 시작이 되는 절기만 해당 */
const JIE_BRANCH: Record<string, number> = {
  小寒: 1, 立春: 2, 惊蛰: 3, 清明: 4, 立夏: 5, 芒种: 6,
  小暑: 7, 立秋: 8, 白露: 9, 寒露: 10, 立冬: 11, 大雪: 0,
};
const KEY_ALIAS: Record<string, string> = {
  DA_XUE: "大雪", XIAO_HAN: "小寒", LI_CHUN: "立春", JING_ZHE: "惊蛰",
};
export const JIE_KO: Record<string, string> = {
  小寒: "소한", 立春: "입춘", 惊蛰: "경칩", 清明: "청명", 立夏: "입하", 芒种: "망종",
  小暑: "소서", 立秋: "입추", 白露: "백로", 寒露: "한로", 立冬: "입동", 大雪: "대설",
};

export interface JieEvent {
  name: string; // 한자 절기명
  /** 이 절기부터 시작하는 달의 월지 index */
  branch: number;
  utcMs: number;
}

const yearCache = new Map<number, JieEvent[]>();

function jieOfYear(year: number): JieEvent[] {
  const cached = yearCache.get(year);
  if (cached) return cached;
  const table = Solar.fromYmdHms(year, 6, 15, 12, 0, 0).getLunar().getJieQiTable();
  const events: JieEvent[] = [];
  for (const [rawKey, s] of Object.entries(table)) {
    const name = KEY_ALIAS[rawKey] ?? rawKey;
    if (!(name in JIE_BRANCH)) continue;
    // 라이브러리의 절기 시각은 베이징시(UTC+8) 기준
    const utcMs =
      Date.UTC(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute(), s.getSecond()) -
      8 * 3_600_000;
    events.push({ name, branch: JIE_BRANCH[name], utcMs });
  }
  events.sort((a, b) => a.utcMs - b.utcMs);
  yearCache.set(year, events);
  return events;
}

/** utcMs 시점에 진행 중인 절기(월의 시작 절기)와 다음 절기 */
export function currentJie(utcMs: number): { current: JieEvent; next: JieEvent } {
  const y = new Date(utcMs).getUTCFullYear();
  const all = [...jieOfYear(y - 1), ...jieOfYear(y), ...jieOfYear(y + 1)];
  const seen = new Set<number>();
  const events = all
    .filter((e) => (seen.has(e.utcMs) ? false : (seen.add(e.utcMs), true)))
    .sort((a, b) => a.utcMs - b.utcMs);
  let idx = -1;
  for (let i = 0; i < events.length; i++) {
    if (events[i].utcMs <= utcMs) idx = i;
    else break;
  }
  if (idx < 0 || idx + 1 >= events.length) {
    throw new RangeError("지원 범위(1900~2100년)를 벗어난 날짜입니다.");
  }
  return { current: events[idx], next: events[idx + 1] };
}

/** 입춘(寅月 시작) 시각. 연주 경계 판정에 사용 */
export function ipchunUtcMs(year: number): number {
  const ev = jieOfYear(year).find((e) => e.name === "立春");
  if (!ev) throw new RangeError(`입춘 정보를 찾을 수 없습니다: ${year}`);
  return ev.utcMs;
}

/** 그레고리력 날짜의 율리우스 일수(JDN, 정수) */
export function julianDayNumber(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  );
}
