"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { safeNextPath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

function authErrorMessage(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (m.includes("email not confirmed"))
    return "이메일 인증이 완료되지 않았습니다. 메일함을 확인해 주세요.";
  if (m.includes("already registered")) return "이미 가입된 이메일입니다.";
  if (m.includes("password")) return "비밀번호는 6자 이상이어야 합니다.";
  if (m.includes("rate limit"))
    return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  return "처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

export async function login(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? ""));

  if (!email || !password)
    return { error: "이메일과 비밀번호를 입력해 주세요." };

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: authErrorMessage(error.message) };

  // 공통 상단 메뉴(로그인 ↔ 마이페이지)를 바로 바꾼다
  revalidatePath("/", "layout");
  redirect(next);
}

export async function signup(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!email || !password)
    return { error: "이메일과 비밀번호를 입력해 주세요." };
  if (password.length < 6) return { error: "비밀번호는 6자 이상이어야 합니다." };
  if (password !== passwordConfirm)
    return { error: "비밀번호 확인이 일치하지 않습니다." };

  const origin = headers().get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL;

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
    },
  });
  if (error) return { error: authErrorMessage(error.message) };

  // 이메일 인증이 꺼져 있으면 세션이 바로 발급됨
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/mypage");
  }

  return {
    message:
      "가입 확인 메일을 보냈습니다. 메일의 링크를 눌러 인증을 완료해 주세요.",
  };
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
