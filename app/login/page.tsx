import { AuthForm } from "@/components/auth-form";
import { safeNextPath } from "@/lib/auth";

export const metadata = { title: "로그인 | 이름핏" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-6">
      <AuthForm
        mode="login"
        next={safeNextPath(searchParams.next)}
        initialError={
          searchParams.error === "callback"
            ? "인증 링크가 만료되었거나 올바르지 않습니다. 다시 로그인해 주세요."
            : undefined
        }
      />
    </main>
  );
}
