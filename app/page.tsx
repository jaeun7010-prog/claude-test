import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-serif text-4xl font-bold">이름핏</h1>
      <p className="text-muted-foreground">
        사주 맞춤 작명 &amp; 희소성 통계 플랫폼
      </p>
      <Button>작명 시작하기</Button>
    </main>
  );
}
