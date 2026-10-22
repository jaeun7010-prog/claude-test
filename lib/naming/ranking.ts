/**
 * 추천 순위 점수 (100점 만점). 화면 순서를 정하는 데만 쓰고, 등급·리포트·저장에는 성명학 점수만 쓴다.
 *
 *   기본 순위 점수 = (성명학 점수 × NAMING + 한자 뜻(0~1) × MEANING + 요즘 어감(0~1) × TREND + 소리 가점)
 *                    ÷ (100 + NAME_SOUND_BONUS) × 100
 *
 * 소리 가점은 이름 소리 목록(name-sounds.ts)에 있는 소리면 NAME_SOUND_BONUS, 아니면 0.
 * 100점 만점을 유지하려고 전체를 나누므로 순서는 가점을 그대로 더한 것과 같다.
 *
 * 비중을 조정하려면 BASE_RANK_WEIGHTS 와 MEANING_CHAR_SCORE 만 바꾸면 된다.
 */
import type { Suitability } from "./hanja-suitability";
import { NAME_SOUND_BONUS } from "./name-sounds";

export const BASE_RANK_WEIGHTS = {
  /** 성명학 점수(0~100)에 곱하는 비율 */
  naming: 0.7,
  /** 한자 뜻 점수(0~1)에 곱하는 점수 */
  meaning: 15,
  /** 요즘 어감 점수(trendScore, 0~1)에 곱하는 점수 */
  trend: 15,
} as const;

/** 한자 뜻 등급별 글자 점수 (0~1). 이름의 한자 뜻 점수는 글자 점수의 평균 */
export const MEANING_CHAR_SCORE: Record<Exclude<Suitability, "exclude">, number> = {
  good: 1,
  normal: 0.6,
  obscure: 0.2,
  awkward: 0,
};

/** 이름 글자들의 한자 뜻 점수 (0~1) */
export function meaningScore(chars: { suitability: Suitability }[]): number {
  if (chars.length === 0) return 0;
  const sum = chars.reduce(
    (s, c) => s + (c.suitability === "exclude" ? 0 : MEANING_CHAR_SCORE[c.suitability]),
    0
  );
  return sum / chars.length;
}

/** 기본 순위 점수 (소수 첫째 자리) */
export function baseRankScore(namingScore: number, meaning: number, trend: number, listedSound = false): number {
  const w = BASE_RANK_WEIGHTS;
  const raw = namingScore * w.naming + meaning * w.meaning + trend * w.trend + (listedSound ? NAME_SOUND_BONUS : 0);
  return Math.round((raw / (100 + NAME_SOUND_BONUS)) * 1000) / 10;
}
