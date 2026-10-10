"use client";

import { useEffect, useRef } from "react";

/** 네이티브 <dialog> 기반 모달. 포커스 트랩/ESC 닫기/배경 스크롤 잠금을 브라우저가 처리한다. */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="w-[calc(100%-2rem)] max-w-md rounded-lg border bg-background p-0 text-foreground shadow-lg backdrop:bg-foreground/40"
    >
      <div className="max-h-[85vh] space-y-4 overflow-y-auto p-6">
        <h2 className="font-serif text-xl font-bold">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
