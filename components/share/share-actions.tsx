"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * 공유 페이지 버튼: 이미지 저장 · 링크 복사 · 공유하기.
 *  - 공유하기는 휴대폰 공유 창(navigator.share)이 있을 때만 보인다 (PC 대부분은 숨김).
 *  - 이미지 저장
 *    - 아이폰: 내려받기가 사진이 아니라 "파일"로 가므로 그림 파일 공유 창을 열고 "이미지 저장"을 고르도록 안내한다.
 *      파일 공유 창이 없으면(카카오톡 안, https가 아닌 주소) 카드 그림을 길게 눌러 저장하도록 안내한다.
 *    - 안드로이드·PC: 서버 주소(?download=1, 첨부 파일)로 내려받는다. 카카오톡 등 앱 안 브라우저는
 *      blob: 주소를 다운로드 관리자에 넘기지 못해 "지원하지 않는 파일 양식"이 떴다 (2026-10-25 갤럭시 카카오톡).
 * 링크는 ?edit 없이 카드 주소만 쓴다 (받는 사람에게 축원 고르기가 보이지 않게).
 */

const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
/** 앱 안 브라우저 (카카오톡·네이버·인스타그램·페이스북·라인) */
const isInApp = () => /KAKAOTALK|NAVER\(|Instagram|FBAN|FBAV|Line\//i.test(navigator.userAgent);

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
  const [env, setEnv] = useState<{ canShare: boolean; ios: boolean; inApp: boolean; iosFiles: boolean } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // 아이폰 공유 창은 누른 직후에 열어야 해서 그림을 미리 받아 둔다
  const image = useRef<File | null>(null);

  useEffect(() => {
    const ios = isIos();
    const canShare = typeof navigator.share === "function";
    // 파일 공유 가능 여부는 그림이 있어야 알 수 있어, 우선 공유 창이 있으면 된다고 보고 받은 뒤 다시 정한다
    setEnv({ canShare, ios, inApp: isInApp(), iosFiles: ios && canShare });
    if (!ios || !canShare) return;
    fetch(imagePath)
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error("image"))))
      .then((blob) => {
        const file = new File([blob], fileName, { type: "image/png" });
        image.current = file;
        const ok = navigator.canShare?.({ files: [file] }) ?? false;
        setEnv((e) => (e ? { ...e, iosFiles: ok } : e));
      })
      .catch(() => setEnv((e) => (e ? { ...e, iosFiles: false } : e)));
  }, [imagePath, fileName]);

  const url = () => `${(process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, "")}${path}`;

  const LONG_PRESS = "위 카드 그림을 길게 눌러 '이미지 저장'(아이폰은 '사진 앱에 저장')을 골라 주세요.";

  const saveImage = async () => {
    setMessage(null);
    if (env?.ios) {
      const file = image.current;
      if (!env.iosFiles || !file) {
        setMessage(LONG_PRESS);
        return;
      }
      setBusy(true);
      try {
        await navigator.share({ files: [file] });
      } catch (e) {
        // 공유 창을 닫은 것은 오류가 아니다
        if ((e as Error).name !== "AbortError") setMessage(LONG_PRESS);
      } finally {
        setBusy(false);
      }
      return;
    }
    // 안드로이드·PC: 진짜 주소를 첨부 파일로 내려받는다 (blob: 주소는 앱 안 브라우저가 못 받음)
    const a = document.createElement("a");
    a.href = `${imagePath}${imagePath.includes("?") ? "&" : "?"}download=1`;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setMessage(
      env?.inApp
        ? `내려받기를 시작했어요. 알림창이나 '내 파일 > 다운로드'에서 볼 수 있어요. 저장되지 않으면 ${LONG_PRESS}`
        : "내려받기를 시작했어요. 알림창이나 '내 파일 > 다운로드'(PC는 다운로드 폴더)에서 볼 수 있어요."
    );
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
      {env?.ios && env.iosFiles && (
        <p className="text-center text-xs text-muted-foreground break-keep">
          아이폰은 이미지 저장을 누른 뒤 공유 창에서 &lsquo;이미지 저장&rsquo;을 고르면 사진에 저장돼요.
        </p>
      )}
      <p role="status" aria-live="polite" className="min-h-4 text-center text-xs text-muted-foreground break-keep">
        {message}
      </p>
    </div>
  );
}
