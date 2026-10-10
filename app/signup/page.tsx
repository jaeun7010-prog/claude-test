import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "회원가입 | 이름핏" };

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <AuthForm mode="signup" />
    </main>
  );
}
