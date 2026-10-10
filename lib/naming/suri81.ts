/**
 * 수리 81수 길흉.
 * 학파마다 분류가 조금씩 다르므로 널리 쓰이는 길수 목록을 기준으로 이분(길/흉)합니다.
 * 기준을 바꾸려면 LUCKY_SURI만 수정하세요.
 */
const LUCKY_SURI: ReadonlySet<number> = new Set([
  1, 3, 5, 6, 7, 8, 11, 13, 15, 16, 17, 18, 21, 23, 24, 25, 29, 31, 32, 33,
  35, 37, 39, 41, 45, 47, 48, 52, 57, 61, 63, 65, 67, 68, 81,
]);

/** 임의의 양의 정수를 1~81 수리로 환원 (82 → 1, 83 → 2 ...) */
export function reduceSuri(n: number): number {
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError(`수리는 1 이상의 정수여야 합니다: ${n}`);
  }
  return ((n - 1) % 81) + 1;
}

export function isLuckySuri(suri: number): boolean {
  return LUCKY_SURI.has(reduceSuri(suri));
}

/** 1~81 인덱스로 길수 여부를 O(1)로 조회 (추천처럼 대량 계산용) */
const LUCKY_TABLE = new Uint8Array(82);
LUCKY_SURI.forEach((n) => {
  LUCKY_TABLE[n] = 1;
});

/** raw 획수 합의 길수 여부 (81 초과는 환원). 반복 호출용 빠른 경로 */
export function isLuckyRaw(n: number): boolean {
  return LUCKY_TABLE[n > 81 ? ((n - 1) % 81) + 1 : n] === 1;
}
