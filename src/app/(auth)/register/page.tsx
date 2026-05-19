import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "회원가입" };

export default function RegisterPage() {
  return (
    <div className="space-y-6 rounded-xl border bg-card p-8 shadow-sm">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">계정 만들기</h1>
        <p className="text-sm text-muted-foreground">
          AI로 나만의 부동산 웹사이트를 시작하세요
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
