"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isUuid } from "@/lib/commerce/payment-sync";
import { createClient } from "@/lib/supabase/server";

/** 저장한 작명 삭제. RLS 로 본인 저장분만 지워진다. 이 저장분으로 결제한 주문은 남고 연결(history_id)만 비워진다 */
export async function deleteSaved(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mypage");
  if (!isUuid(id)) redirect("/mypage");

  const { error } = await supabase.from("user_naming_history").delete().eq("id", id);
  if (error) {
    console.error("[mypage] 저장 이름 삭제 실패", error);
    redirect(`/mypage/names/${id}?deleteError=1`);
  }

  revalidatePath("/mypage");
  redirect("/mypage");
}

export type DeleteSavedManyResult = { ok: true; deleted: number } | { ok: false; error: string };

/** 마이페이지 목록에서 저장 이름 여러 개를 한꺼번에 삭제. deleteSaved 와 같이 RLS 로 본인 저장분만, 주문은 남는다 */
export async function deleteSavedMany(ids: string[]): Promise<DeleteSavedManyResult> {
  const valid = Array.from(new Set(ids.filter((id) => typeof id === "string" && isUuid(id))));
  if (valid.length === 0) return { ok: false, error: "삭제할 이름을 골라 주세요." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data, error } = await supabase.from("user_naming_history").delete().in("id", valid).select("id");
  if (error) {
    console.error("[mypage] 저장 이름 삭제 실패", error);
    return { ok: false, error: "삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/mypage");
  return { ok: true, deleted: data?.length ?? 0 };
}
