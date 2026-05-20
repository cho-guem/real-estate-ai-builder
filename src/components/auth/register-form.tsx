"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { signUpAction } from "@/app/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const [state, action, pending] = useActionState(signUpAction, {});

  if (state.message) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <svg
            className="h-6 w-6 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-foreground">이메일을 확인해주세요</p>
          <p className="text-sm text-muted-foreground">
            {state.message}
            <br />
            링크를 클릭하면 로그인할 수 있어요.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-block text-sm font-semibold text-primary hover:underline"
        >
          로그인 화면으로 이동
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" aria-busy={pending}>
      {state.error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="fullName">이름</Label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          placeholder="홍길동"
          autoComplete="name"
          required
          disabled={pending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">이메일</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="example@email.com"
          autoComplete="email"
          required
          disabled={pending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="8자 이상 입력해주세요"
          autoComplete="new-password"
          required
          disabled={pending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">비밀번호 확인</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="비밀번호를 다시 입력해주세요"
          autoComplete="new-password"
          required
          disabled={pending}
        />
      </div>

      <Button type="submit" disabled={pending} className="w-full font-semibold">
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {pending ? "가입 중..." : "회원가입"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          로그인
        </Link>
      </p>
    </form>
  );
}
