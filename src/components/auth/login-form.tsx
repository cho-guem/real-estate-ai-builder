"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { signInAction } from "@/app/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, action, pending] = useActionState(signInAction, {});

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

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
          placeholder="비밀번호를 입력하세요"
          autoComplete="current-password"
          required
          disabled={pending}
        />
      </div>

      <Button type="submit" disabled={pending} className="w-full font-semibold">
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {pending ? "로그인 중..." : "로그인"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        계정이 없으신가요?{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          회원가입
        </Link>
      </p>
    </form>
  );
}
