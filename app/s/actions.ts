"use server";

import { redirect } from "next/navigation";

import { createNameShare, loadNameShare, SHARE_EDIT_PARAM, type ShareInput } from "@/lib/share/name-share";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * 이름 카드를 만들고 공유 페이지로 넘어간다. 로그인하지 않아도 된다.
 * 이름·한자·축원 번호만 받는다 (생년월일·사주는 받지 않음).
 */
export async function shareName(input: ShareInput): Promise<{ error: string }> {
  const created = await createNameShare(createClient(), createAdminClient(), input);
  if (!created.ok) return { error: created.error };
  redirect(`/s/${created.value}?${SHARE_EDIT_PARAM}=1`);
}

/** 공유 페이지에서 축원 바꾸기: 같은 이름 + 고른 축원으로 카드를 만들고(있으면 그 카드) 그 주소로 */
export async function changeBlessing(formData: FormData): Promise<void> {
  const admin = createAdminClient();
  const share = await loadNameShare(admin, String(formData.get("id") ?? ""));
  if (!share) redirect("/");
  const created = await createNameShare(createClient(), admin, {
    kind: share.kind,
    surname: share.surname,
    surnameHanja: share.surnameHanja,
    given: share.given,
    givenHanja: share.givenHanja,
    prefixLength: share.prefixLength,
    blessingIndex: Number(formData.get("b")),
  });
  redirect(created.ok ? `/s/${created.value}?${SHARE_EDIT_PARAM}=1` : `/s/${share.id}?${SHARE_EDIT_PARAM}=1`);
}
