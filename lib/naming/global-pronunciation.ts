/**
 * 글로벌(영어권) 발음 호환 점수 (0~100, 높을수록 영어권 화자가 읽고 발음하기 쉬움).
 *
 * 한글 음절을 초성/중성/종성으로 분해해 영어 화자가 헷갈리기 쉬운 요소에 감점하는
 * 단순 휴리스틱입니다. 언어학적 정밀 평가가 아니라 후보를 거르는 참고 지표입니다.
 */
const BASE = 0xac00;

const ONSET_PENALTY: Record<number, number> = {
  // ㄱ ㄲ ㄴ ㄷ ㄸ ㄹ ㅁ ㅂ ㅃ ㅅ ㅆ ㅇ ㅈ ㅉ ㅊ ㅋ ㅌ ㅍ ㅎ
  1: 12, 4: 12, 5: 8, 8: 12, 10: 8, 13: 12,
};

/** 중성(모음) 감점: ㅓ ㅕ ㅡ ㅢ ㅟ 등 영어에 없거나 철자(eo, eu, ui)가 혼동되는 모음 */
const VOWEL_PENALTY: Record<number, number> = {
  4: 18, // ㅓ (eo)
  6: 18, // ㅕ (yeo)
  18: 22, // ㅡ (eu)
  19: 28, // ㅢ (ui)
  16: 10, // ㅙ
  11: 8, // ㅚ
  14: 8, // ㅝ
  17: 8, // ㅟ
};

const CODA_PENALTY: Record<number, number> = {
  // 겹받침·ㄹ계열 받침은 로마자 표기가 길어지고 발음이 달라짐
  3: 8, 5: 8, 6: 8, 9: 8, 10: 8, 11: 8, 12: 8, 13: 8, 14: 8, 15: 8, 18: 8, 20: 0,
};

export function syllableGlobalScore(ch: string): number {
  const code = ch.charCodeAt(0) - BASE;
  if (code < 0 || code > 11171) return 70;
  const onset = Math.floor(code / 588);
  const vowel = Math.floor((code % 588) / 28);
  const coda = code % 28;
  const penalty =
    (ONSET_PENALTY[onset] ?? 0) + (VOWEL_PENALTY[vowel] ?? 0) + (CODA_PENALTY[coda] ?? 0);
  return Math.max(0, 100 - penalty);
}

export function globalPronunciationScore(hangulName: string): number {
  const chars = [...hangulName];
  if (chars.length === 0) return 0;
  const avg = chars.reduce((s, c) => s + syllableGlobalScore(c), 0) / chars.length;
  return Math.round(avg);
}
