import { NamingForm } from "@/components/naming-form";
import { NamingModeTabs } from "@/components/naming/naming-mode-tabs";

export const metadata = { title: "작명하기 | 이름핏" };

export default function NamingPage() {
  return (
    <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-serif text-3xl font-bold">사주 맞춤 작명</h1>
      <p className="mb-6 mt-2 text-sm text-muted-foreground">
        생년월일시로 사주를 풀어 부족한 기운(용신)을 채우는 이름을 추천합니다.
      </p>
      <div className="mb-8">
        <NamingModeTabs active="recommend" />
      </div>
      <NamingForm />
    </main>
  );
}
