import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "설정" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">설정</h1>
        <p className="mt-1 text-sm text-muted-foreground">계정 및 서비스 환경을 관리하세요</p>
      </div>

      <div className="max-w-xl space-y-6">
        {/* 계정 정보 */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">계정 정보</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">이름</p>
              <p className="mt-0.5 text-sm font-medium">
                {user?.user_metadata?.full_name ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">이메일</p>
              <p className="mt-0.5 text-sm font-medium">{user?.email ?? "—"}</p>
            </div>
          </div>
        </div>

        {/* API 연동 */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-1 font-semibold">AI 연동</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Anthropic API 키를 설정하면 AI 자동 생성 기능을 사용할 수 있어요.
          </p>
          <div className="rounded-lg bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            준비 중 — 다음 업데이트에서 추가될 예정이에요.
          </div>
        </div>
      </div>
    </div>
  );
}
