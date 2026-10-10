import { createClient } from "@supabase/supabase-js";

/**
 * service_role 클라이언트. RLS를 우회하므로 서버 코드(서버 액션/라우트)에서만 사용하세요.
 * 결제 검증을 마친 뒤 orders 를 paid 로 갱신하는 용도로만 씁니다.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않았습니다.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
