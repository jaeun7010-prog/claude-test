/**
 * 요즘 신생아 이름 트렌드 점수 (0~1).
 *
 * 공개 통계 원본이 저장소에 없어 "현대적인 음절 목록 + 발음 조화" 휴리스틱으로 평가합니다.
 * 목록은 경험적으로 큐레이션한 것이므로 `supabase/seed`의 name_stats가 충분히 적재되면
 * 그 데이터로 교체·보정하는 것이 좋습니다.
 */

const BASE = 0xac00;

/** A: 최근 선호가 가장 두드러진 음절 */
const TIER_A = "서아윤우준시하율현";
/** B: 현대적이고 널리 쓰이는 음절 */
const TIER_B = "지민예은유도연수이안로온린해채소건원다인주담나한솔빈재승호태규설진선";
/** C: 무난하지만 중립적인 음절 */
const TIER_C = "정경찬혁영성";
/** D: 다소 예스럽게 느껴지는 음절 (순위 하락) */
const TIER_D = "희혜미훈석환기상용동종";

/** 요즘은 이름으로 거의 쓰이지 않는 음절 — 후보에서 제외 */
const ARCHAIC = "철식순숙옥봉갑병길복팔덕출칠분녀례춘말점필달득쇠돌판삼만";
/** 이름 끝 글자로 쓰이면 예스러운 음절 (예: 영자, 미자) */
const ARCHAIC_LAST = "자";

const WEIGHT = new Map<string, number>();
for (const c of TIER_D) WEIGHT.set(c, 0.2);
for (const c of TIER_C) WEIGHT.set(c, 0.45);
for (const c of TIER_B) WEIGHT.set(c, 0.7);
for (const c of TIER_A) WEIGHT.set(c, 1);
const ARCHAIC_SET = new Set(ARCHAIC);

/** 목록에 없는 음절(낯선 음절)의 기본 가중치 */
const UNKNOWN_WEIGHT = 0.3;

/** 이 점수 미만인 조합은 "낯선 조합"으로 보고 1차 추천에서 제외 */
export const TREND_MIN = 0.55;

export const isArchaicSyllable = (eum: string) => ARCHAIC_SET.has(eum);

// 받침 인덱스: 없음(0) · ㄴ(4) · ㄹ(8) · ㅁ(16) · ㅇ(21)은 부드럽고, 나머지는 거센 받침
const SOFT_CODA = new Set([0, 4, 8, 16, 21]);

export function harmony(chars: string[]): number {
  const per = chars.map((ch) => {
    const code = ch.charCodeAt(0) - BASE;
    if (code < 0 || code > 11171) return 0.7;
    const coda = code % 28;
    return coda === 0 ? 1 : SOFT_CODA.has(coda) ? 0.85 : 0.5;
  });
  return per.reduce((s, v) => s + v, 0) / per.length;
}

/**
 * 한글 이름(성 제외)의 트렌드 점수. 제외 대상(예스러운 음절, 같은 글자 반복)이면 -1.
 * `allow`에 든 음절(돌림자 등 사용자가 직접 지정한 글자)은 예스러워도 제외하지 않는다.
 */
export function trendScore(hangulName: string, allow?: ReadonlySet<string>): number {
  const chars = [...hangulName];
  if (chars.length === 0) return 0;

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (allow?.has(c)) continue;
    if (ARCHAIC_SET.has(c)) return -1;
    if (i === chars.length - 1 && chars.length > 1 && ARCHAIC_LAST.includes(c)) return -1;
  }
  if (chars.length === 2 && chars[0] === chars[1]) return -1;

  const w = chars.reduce((s, c) => s + (WEIGHT.get(c) ?? UNKNOWN_WEIGHT), 0) / chars.length;
  return 0.7 * w + 0.3 * harmony(chars);
}
