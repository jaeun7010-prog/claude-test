/** 로그인 후 이동 경로 검증: 사이트 내부 경로만 허용 (open redirect 방지) */
export function safeNextPath(
  next: string | null | undefined,
  fallback = "/mypage"
) {
  if (
    next &&
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.startsWith("/\\")
  ) {
    return next;
  }
  return fallback;
}
