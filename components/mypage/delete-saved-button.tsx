"use client";

import { useFormStatus } from "react-dom";

import { deleteSaved } from "@/app/mypage/actions";
import { Button } from "@/components/ui/button";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" className="text-destructive" disabled={pending}>
      {pending ? "삭제 중…" : "삭제"}
    </Button>
  );
}

/** 삭제 확인 문구 (상세의 삭제 버튼과 목록의 이름별·선택 삭제가 함께 쓴다) */
export function deleteConfirmText(names: string[]) {
  const target = names.length === 1 ? `"${names[0]}"` : `이름 ${names.length}개`;
  return `정말 삭제할까요?\n\n저장한 ${target}을(를) 삭제하면 되돌릴 수 없습니다. 결제한 리포트와 주문 내역은 그대로 남습니다.`;
}

/** 저장한 이름 삭제 (확인 후 서버 액션) */
export function DeleteSavedButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteSaved}
      onSubmit={(e) => {
        if (!window.confirm(deleteConfirmText([name])))
          e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Submit />
    </form>
  );
}
