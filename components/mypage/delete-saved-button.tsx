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

/** 저장한 이름 삭제 (확인 후 서버 액션) */
export function DeleteSavedButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteSaved}
      onSubmit={(e) => {
        if (!window.confirm(`저장한 "${name}"을(를) 삭제할까요? 삭제하면 되돌릴 수 없습니다. 결제한 리포트와 주문은 그대로 남습니다.`))
          e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Submit />
    </form>
  );
}
