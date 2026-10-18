/**
 * 순우리말 이름 글자 수 조건 (2026-10-18 사용자 결정).
 * 외자는 "외자"를 골랐을 때만 보여 준다. 글자 하나로만 용신·흐름을 보면 점수가 극단적으로 갈려 "상관없음"에서 상위를 차지하기 때문이다.
 */
export type NativeLength = "single" | "double" | "any";

export function nativeLengthAllowed(length: number, mode: NativeLength): boolean {
  if (mode === "single") return length === 1;
  if (mode === "double") return length === 2;
  return length >= 2 && length <= 3;
}

/** 외자를 골랐는데 화면 수를 못 채울 때의 안내 */
export const NATIVE_SINGLE_SHORTAGE_NOTICE = "순우리말 외자 이름은 많지 않아요";
