import Link from "next/link";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-serif text-4xl font-bold">이름핏</h1>
      <p className="text-muted-foreground">
        사주 맞춤 작명 &amp; 희소성 통계 플랫폼
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/naming">작명 시작하기</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/stats">이름 통계</Link>
        </Button>
        {user ? (
          <Button asChild variant="outline">
            <Link href="/mypage">마이페이지</Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href="/login">로그인</Link>
          </Button>
        )}
      </div>
    </main>
  );
}
