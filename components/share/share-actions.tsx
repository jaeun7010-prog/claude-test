"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * 공유 페이지 버튼: 이미지 저장 · 링크 복사 · 공유하기.
 *  - 공유하기는 휴대폰 공유 창(navigator.share)이 있을 때만 보인다 (PC 대부분은 숨김).
 *  - 아이폰은 내려받기가 사진이 아니라 "파일"로 가므로, 이미지 저장을 공유 창(그림 파일)으로 열고 "이미지 저장"을 고르도록 안내한다.
 * 링크는 ?edit 없이 카드 주소만 쓴다 (받는 사람에게 축원 고르기가 보이지 않게).
 */

const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 오래된 브라우저·권한 거절: 숨긴 입력 칸으로 복사
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    el.remove();
    return ok;
  }
}

export function ShareActions({
  path,
  imagePath,
  fileName,
  title,
  text,
}: {
  /** 카드 주소 (/s/abcd1234) */
  path: string;
  /** 저장용 세로 그림 주소 */
  imagePath: string;
  fileName: string;
  title: string;
  text: string;
}) {
  // 공유 창·기기 확인은 브라우저에서만 할 수 있어 화면을 그린 뒤 정한다 (서버 화면과 어긋나지 않게)
  const [env, setEnv] = useState<{ canShare: boolean; ios: boolean } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // 아이폰 공유 창은 누른 직후에 열어야 해서 그림을 미리 받아 둔다
  const image = useRef<Promise<Blob> | null>(null);

  useEffect(() => {
    setEnv({ canShare: typeof navigator.share === "function", ios: isIos() });
    image.current = fetchImage();
    image.current.catch(() => {
      image.current = null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 처음 한 번만
  }, []);

  const url = () => `${(process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, "")}${path}`;

  async function fetchImage() {
    const res = await fetch(imagePath);
    if (!res.ok) throw new Error("image");
    return res.blob();
  }

  const saveImage = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const blob = await (image.current ?? fetchImage());
      const file = new File([blob], fileName, { type: "image/png" });
      if (env?.ios && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
      setMessage("이미지를 저장했어요.");
    } catch (e) {
      // 공유 창을 닫은 것은 오류가 아니다
      if ((e as Error).name !== "AbortError") setMessage("이미지를 저장하지 못했어요. 카드 그림을 길게 눌러 저장해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    setMessage((await copyText(url())) ? "링크를 복사했어요." : "링크를 복사하지 못했어요.");
  };

  const share = async () => {
    setMessage(null);
    try {
      await navigator.share({ title, text, url: url() });
    } catch (e) {
      if ((e as Error).name !== "AbortError") setMessage("공유하지 못했어요. 링크 복사를 이용해 주세요.");
    }
  };

  return (
    <div className="space-y-2">
      <div className={`grid gap-2 ${env?.canShare ? "grid-cols-3" : "grid-cols-2"}`}>
        <Button type="button" variant="outline" onClick={saveImage} disabled={busy} className="px-2">
          {busy ? "준비 중…" : "이미지 저장"}
        </Button>
        <Button type="button" variant="outline" onClick={copyLink} className="px-2">
          링크 복사
        </Button>
        {env?.canShare && (
          <Button type="button" onClick={share} className="px-2">
            공유하기
          </Button>
        )}
      </div>
      {env?.ios && (
        <p className="text-center text-xs text-muted-foreground break-keep">
          아이폰은 이미지 저장을 누른 뒤 공유 창에서 &lsquo;이미지 저장&rsquo;을 고르면 사진에 저장돼요.
        </p>
      )}
      <p role="status" aria-live="polite" className="min-h-4 text-center text-xs text-muted-foreground">
        {message}
      </p>
    </div>
  );
}
