/**
 * 요즘 이름에 흔히 쓰이는 음절. 통계(name_stats)가 연동되기 전까지
 * "이름다운 이름"을 앞에 세우기 위한 자연스러움 가중치로만 사용합니다.
 */
export const COMMON_SYLLABLES: ReadonlySet<string> = new Set(
  (
    "서윤지우민준도하예은아현수연유채소시진주건재원영승호성태인규린율온로이안해솔빈담다설별한혁찬빛겸란경희정미선혜훈석환기상용동"
  ).split("")
);

/** 0~1: 이름 음절 중 흔히 쓰이는 음절의 비율 */
export function naturalness(hangulName: string): number {
  const chars = [...hangulName];
  if (chars.length === 0) return 0;
  return chars.filter((c) => COMMON_SYLLABLES.has(c)).length / chars.length;
}
