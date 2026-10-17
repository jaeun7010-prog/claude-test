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
