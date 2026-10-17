"use server";

import { parsePriorities } from "@/lib/naming/priorities";
import { createClient } from "@/lib/supabase/server";

export type SavePrioritiesResult = { ok: true } | { ok: false };

/** 로그인한 사용자의 "우리 집 우선순위"를 profiles.naming_priorities 에 저장 (값은 서버에서 다시 검증) */
export async function savePriorities(raw: unknown): Promise<SavePrioritiesResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("profiles")
    .update({ naming_priorities: parsePriorities(raw) })
    .eq("id", user.id);
  if (error) {
    // 42703: 마이그레이션(naming_priorities 컬럼) 미적용
    console.error("[naming] 우선순위 저장 실패", error);
    return { ok: false };
  }
  return { ok: true };
}
