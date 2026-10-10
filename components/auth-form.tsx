"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";

import { login, signup, type AuthState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "처리 중..." : children}
    </Button>
  );
}

export function AuthForm({
  mode,
  next,
  initialError,
}: {
  mode: "login" | "signup";
  next?: string;
  initialError?: string;
}) {
  const isLogin = mode === "login";
  const [state, formAction] = useFormState<AuthState, FormData>(
    isLogin ? login : signup,
    { error: initialError }
  );

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{isLogin ? "로그인" : "회원가입"}</CardTitle>
        <CardDescription>
          {isLogin
            ? "작명 결과를 마이페이지에서 확인하세요."
            : "가입하고 작명 결과를 계속 보관하세요."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {isLogin && next && <input type="hidden" name="next" value={next} />}
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input id="name" name="name" autoComplete="name" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              minLength={6}
              required
            />
          </div>
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">비밀번호 확인</Label>
              <Input
                id="passwordConfirm"
                name="passwordConfirm"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
          )}

          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          {state.message && (
            <p role="status" className="text-sm text-primary">
              {state.message}
            </p>
          )}

          <Submit>{isLogin ? "로그인" : "가입하기"}</Submit>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {isLogin ? (
            <>
              계정이 없으신가요?{" "}
              <Link href="/signup" className="text-primary underline">
                회원가입
              </Link>
            </>
          ) : (
            <>
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="text-primary underline">
                로그인
              </Link>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
