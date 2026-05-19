import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "로그인" };

export default function LoginPage() {
  return (
    <div className="space-y-6 rounded-xl border bg-card p-8 shadow-sm">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">다시 만나서 반가워요</h1>
        <p className="text-sm text-muted-foreground">계정에 로그인하여 계속하세요</p>
      </div>
      <LoginForm />
    </div>
  );
}
