import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, FileDown, Layers3, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const STEPS = [
  "벤치마크 선택",
  "사이트 구조 승인",
  "기능/UX 기획",
  "SEO·브랜드·디자인 승인",
  "랜딩페이지 미리보기",
];

export default async function MarketingLandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const dashboardHref = user ? "/dashboard" : "/login";

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-background/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              AI
            </span>
            AI 부동산 빌더
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex h-8 items-center rounded-lg px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              로그인
            </Link>
            <Link
              href="/register"
              className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              무료로 시작하기
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Real Estate Website Builder MVP
          </div>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight lg:text-6xl">
            부동산 웹사이트 초안을 AI 워크플로우로 단계별 생성하세요
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            공장, 창고, 상업용 부동산 웹사이트에 필요한 벤치마크, 구조, 기능, SEO, 브랜드,
            디자인을 승인하고 실제 랜딩페이지 미리보기까지 확인합니다.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/projects/new"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              프로젝트 만들기
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={dashboardHref}
              className="inline-flex h-9 items-center rounded-lg border px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              대시보드 보기
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">강남 공장·창고 전문 웹사이트</p>
                <p className="text-sm text-muted-foreground">산업 프리셋: 부동산</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {STEPS.map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-lg bg-background px-3 py-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="flex-1">{step}</span>
                  <span className="text-xs text-muted-foreground">{index + 1}/5</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/20">
        <div className="mx-auto grid max-w-6xl gap-4 px-6 py-12 md:grid-cols-3">
          {[
            { icon: Layers3, title: "단계형 제작", body: "기획부터 미리보기까지 승인 흐름으로 진행합니다." },
            { icon: Building2, title: "부동산 MVP", body: "현재는 부동산 웹사이트 제작에 집중합니다." },
            { icon: FileDown, title: "내보내기 준비", body: "생성 완료 후 다운로드와 공유 흐름으로 확장됩니다." },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border bg-card p-5">
              <item.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-4 font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
