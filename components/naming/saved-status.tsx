import Link from "next/link";

/**
 * 저장 후 결과 화면으로 돌아왔을 때의 안내 (추천받기·직접 짓기·순우리말 공통).
 * 주소: saved=<저장 id>, already=1(이미 저장한 이름), 추천받기는 어느 카드인지 sv(한자)·svn(순우리말 법적 이름)
 */
export const SAVED_PARAM = "saved";
export const ALREADY_PARAM = "already";
export const SAVED_HANJA_PARAM = "sv";
export const SAVED_NATIVE_PARAM = "svn";
/** 결과 화면 qs 에 다시 싣지 않는 저장 안내용 키 */
export const SAVE_RESULT_PARAMS = [SAVED_PARAM, ALREADY_PARAM, SAVED_HANJA_PARAM, SAVED_NATIVE_PARAM, "saveError"];

export interface SavedNotice {
  id: string;
  already: boolean;
}

/** 저장 후 돌아갈 주소 (#saved 로 안내가 있는 카드까지 내려간다) */
export const savedBackHref = (back: string, id: string, already: boolean, extra = "") =>
  `${back}&${SAVED_PARAM}=${id}${already ? `&${ALREADY_PARAM}=1` : ""}${extra}#saved`;

/**
 * 저장 버튼 자리: 방금 저장했으면 "✓ 마이페이지에 저장했어요"(이미 저장했으면 "✓ 이미 저장한 이름이에요"),
 * 화면을 열 때 이미 저장한 이름이면 "✓ 저장한 이름". 셋 다 "저장한 이름 보기" 링크를 붙인다
 */
export function SavedMark({ id, justSaved }: { id: string; justSaved?: SavedNotice }) {
  const text = justSaved ? (justSaved.already ? "✓ 이미 저장한 이름이에요" : "✓ 마이페이지에 저장했어요") : "✓ 저장한 이름";
  return (
    <p
      id={justSaved ? "saved" : undefined}
      role={justSaved ? "status" : undefined}
      className="flex min-h-9 scroll-mt-20 flex-wrap items-center rounded-md bg-secondary px-3 py-1.5 text-sm"
    >
      {text}
      <span className="mx-1.5 text-muted-foreground">·</span>
      <Link href={`/mypage/names/${justSaved?.id ?? id}`} className="text-primary underline underline-offset-2">
        저장한 이름 보기
      </Link>
    </p>
  );
}
