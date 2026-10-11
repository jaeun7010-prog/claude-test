"use client";

import { useFormState, useFormStatus } from "react-dom";

import { uploadNameStats, type UploadState } from "@/app/admin/name-stats/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CSV_SAVE_GUIDE } from "@/lib/name-stats/constants";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "검증·반영 중..." : "업로드"}
    </Button>
  );
}

export function NameStatsUploadForm({ defaultSourceName }: { defaultSourceName: string }) {
  const [state, formAction] = useFormState<UploadState, FormData>(uploadNameStats, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file">CSV 파일 (UTF-8, name,year,gender,count)</Label>
        <Input id="file" name="file" type="file" accept=".csv,text/csv" required />
        <p className="text-xs text-muted-foreground">{CSV_SAVE_GUIDE}해 주세요.</p>
        <Button asChild variant="outline" size="sm">
          <a href="/admin/name-stats/template" download>
            CSV 템플릿 다운로드
          </a>
        </Button>
      </div>
      <div className="space-y-2">
        <Label htmlFor="asOfDate">데이터 기준일</Label>
        <Input id="asOfDate" name="asOfDate" type="date" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sourceName">출처명</Label>
        <Input id="sourceName" name="sourceName" defaultValue={defaultSourceName} required />
      </div>

      {state.message && (
        <p role="status" className="text-sm text-primary">
          {state.message}
        </p>
      )}
      {state.errors && state.errors.length > 0 && (
        <div role="alert" className="space-y-2 text-sm text-destructive">
          <p className="font-medium">
            오류 {state.errorCount?.toLocaleString("ko-KR")}건이 있어 반영하지 않았습니다.
          </p>
          <ul className="max-h-64 list-disc space-y-0.5 overflow-y-auto pl-5">
            {state.errors.map((e, i) => (
              <li key={i}>
                {e.line ? `${e.line}행: ` : ""}
                {e.message}
              </li>
            ))}
          </ul>
          {(state.errorCount ?? 0) > state.errors.length && (
            <p>앞에서부터 {state.errors.length}건만 표시했습니다.</p>
          )}
        </div>
      )}

      <Submit />
    </form>
  );
}
