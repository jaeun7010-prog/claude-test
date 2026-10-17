import { SiteNav } from "@/components/site/site-nav";
import { createClient } from "@/lib/supabase/server";

/** 공통 상단 메뉴. 로그인·관리자 여부는 서버에서 확인한다 (관리자 메뉴는 is_admin() 결과로만 보여 준다) */
export async function SiteHeader() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data } = await supabase.rpc("is_admin");
    isAdmin = data === true;
  }
  return <SiteNav loggedIn={!!user} isAdmin={isAdmin} />;
}
