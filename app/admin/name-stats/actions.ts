"use server";

import { revalidatePath } from "next/cache";

import { CSV_SAVE_GUIDE } from "@/lib/name-stats/constants";
import { ingestNameStats } from "@/lib/name-stats/ingest";
import { createCsvUploadSource } from "@/lib/name-stats/sources/csv-upload";
import type { SourceError } from "@/lib/name-stats/sources/types";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_SHOWN_ERRORS = 200;

export type UploadState = {
  message?: string;
  errors?: SourceError[];
  /** 전체 오류 건수 (errors 는 앞에서부터 일부만 담는다) */
  errorCount?: number;
};

const fail = (message: string): UploadState => ({ errors: [{ message }], errorCount: 1 });

export async function uploadNameStats(
  _prev: UploadState,
  formData: FormData
): Promise<UploadState> {
  const supabase = createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return fail("관리자만 업로드할 수 있습니다.");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("CSV 파일을 선택해 주세요.");
  if (file.size > MAX_FILE_BYTES) return fail("파일이 너무 큽니다 (최대 4MB).");

  let csv: string;
  try {
    csv = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
  } catch {
    return fail(`파일 인코딩이 UTF-8이 아닙니다. ${CSV_SAVE_GUIDE}한 뒤 다시 올려 주세요.`);
  }

  const result = await ingestNameStats(
    supabase,
    createCsvUploadSource({
      csv,
      asOfDate: String(formData.get("asOfDate") ?? "").trim(),
      sourceName: String(formData.get("sourceName") ?? ""),
    })
  );
  if (!result.ok)
    return { errors: result.errors.slice(0, MAX_SHOWN_ERRORS), errorCount: result.errors.length };

  revalidatePath("/admin/name-stats");
  return {
    message: `${result.rowCount.toLocaleString("ko-KR")}행을 반영했습니다. (교체된 연도: ${result.years.join(", ")})`,
  };
}
