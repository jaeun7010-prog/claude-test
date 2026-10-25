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

export function SavedStatus({ saved }: { saved: SavedNotice }) {
  return (
    <p id="saved" role="status" className="scroll-mt-20 rounded-md bg-secondary p-3 text-sm">
      {saved.already ? "이미 마이페이지에 저장한 이름이에요. " : "마이페이지에 저장했어요. "}
      <Link href={`/mypage/names/${saved.id}`} className="text-primary underline underline-offset-2">
        저장한 이름 보기
      </Link>
    </p>
  );
}
