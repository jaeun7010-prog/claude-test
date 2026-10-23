"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * #report-root 를 A4 PDF 로 저장한다. 브라우저에서 렌더링한 폰트(나눔명조) 그대로 출력된다.
 * autoStart: 페이지를 열자마자 한 번 내려받는다 (마이페이지 상세의 "PDF 다운로드")
 */
export function ReportDownloadButton({ filename, autoStart = false }: { filename: string; autoStart?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoStarted = useRef(false);

  useEffect(() => {
    if (!autoStart || autoStarted.current) return;
    autoStarted.current = true;
    void download();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  async function download() {
    const el = document.getElementById("report-root");
    if (!el || busy) return;
    setBusy(true);
    setError(null);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await document.fonts.ready;
      // pagebreak 는 런타임에서 지원되지만 번들된 타입 정의에는 없어 변수로 넘긴다
      const options = {
        margin: 0,
        filename,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#fdfbf7" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        // 쪽마다 break-after: page(css)가 있어 after 선택자를 함께 주면 쪽 나눔이 두 번 들어가 빈 쪽이 생긴다
        pagebreak: { mode: ["css"] },
      } as const;
      await html2pdf()
        .set(options as never)
        .from(el)
        .save();
    } catch (e) {
      console.error("[report] PDF 생성 실패", e);
      setError("PDF를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={download} disabled={busy}>
        {busy ? "PDF 생성 중…" : "PDF 다운로드"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
