"use client";

import { useState, useTransition } from "react";

import { shareName } from "@/app/s/actions";
import { Button } from "@/components/ui/button";
import type { ShareInput } from "@/lib/share/name-share";

/**
 * "이름 카드 공유" 버튼 (추천받기 결과 카드·직접 짓기 결과·마이페이지 상세).
 * 이름·한자·부모 성 글자 수만 넘기고(생년월일·사주 없음), 서버가 카드를 만든 뒤 공유 페이지(/s/[id]?edit=1)로 넘어간다.
 * 축원은 기본 문장으로 시작하고 공유 페이지에서 바꾼다.
 */
export function ShareNameButton({
  input,
  label = "이름 카드 공유",
  className,
}: {
  input: Omit<ShareInput, "blessingIndex">;
  label?: string;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        className={className}
        onClick={() =>
          start(async () => {
            setError(null);
            // 성공하면 서버가 공유 페이지로 넘긴다 (돌아오는 값은 오류뿐)
            const r = await shareName({ ...input, blessingIndex: 0 });
            if (r?.error) setError(r.error);
          })
        }
      >
        {pending ? "카드 만드는 중…" : label}
      </Button>
      {error && (
        <p role="alert" className="basis-full text-xs text-destructive">
          {error}
        </p>
      )}
    </>
  );
}
