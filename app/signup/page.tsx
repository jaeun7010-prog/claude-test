import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "회원가입 | 이름핏" };

export default function SignupPage() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-6">
      <AuthForm mode="signup" />
    </main>
  );
}
