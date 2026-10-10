import { NamingForm } from "@/components/naming-form";

export const metadata = { title: "작명하기 | 이름핏" };

export default function NamingPage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-12">
      <h1 className="font-serif text-3xl font-bold">사주 맞춤 작명</h1>
      <p className="mb-8 mt-2 text-sm text-muted-foreground">
        생년월일시로 사주를 풀어 부족한 기운(용신)을 채우는 이름을 추천합니다.
      </p>
      <NamingForm />
    </main>
  );
}
