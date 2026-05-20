"use client";

import { useState } from "react";
import { CheckCircle2, Download, Loader2, MapPin, Monitor, Phone, ShieldCheck, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GeneratedSiteData } from "@/types/generated-site.types";

type PreviewMode = "desktop" | "mobile";

export function buildPreviewValidation(site?: GeneratedSiteData | null) {
  const sections = site?.sections ?? [];
  const ctas = sections.map((section) => section.ctaLabel).filter(Boolean);
  const checks = [
    {
      label: "CTA가 주요 섹션에 포함되어 있음",
      passed: ctas.length > 0,
      issue: "CTA 문구가 비어 있습니다.",
    },
    {
      label: "비어 있는 랜딩 섹션이 없음",
      passed: sections.length > 0 && sections.every((section) => section.title && (section.body || section.type === "inquiry")),
      issue: "제목 또는 본문이 비어 있는 섹션이 있습니다.",
    },
    {
      label: "활성화된 핵심 기능이 프리뷰에 반영됨",
      passed: Boolean(site?.layout.showMap || site?.layout.showPropertyCards || site?.layout.showInquiryForm),
      issue: "활성화된 기능이 프리뷰 구성에 반영되지 않았습니다.",
    },
    {
      label: "브랜드 톤과 카피 방향이 일관됨",
      passed: Boolean(site?.trustItems.length),
      issue: "브랜드 신뢰 문구가 부족합니다.",
    },
    {
      label: "모바일 UX 흐름 권장사항이 존재함",
      passed: Boolean(site),
      issue: "모바일 UX 흐름 권장사항이 없습니다.",
    },
  ];

  return {
    checks,
    issues: checks.filter((check) => !check.passed).map((check) => check.issue),
  };
}

function GeneratedSiteExportControls({ projectId }: { projectId: string }) {
  const [status, setStatus] = useState<"idle" | "downloading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function downloadWordPressPackage() {
    setStatus("downloading");
    setError("");

    try {
      const res = await fetch(`/api/projects/${projectId}/wordpress-package`);
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "WordPress 패키지를 생성하지 못했습니다.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "wordpress-site-package.zip";
      link.click();
      URL.revokeObjectURL(url);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "다운로드 중 오류가 발생했습니다.");
      setStatus("error");
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold">WordPress 설치 패키지</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Elementor 템플릿, 매물 관리 플러그인, 설치 안내서를 하나의 ZIP으로 다운로드합니다.
          </p>
        </div>
        <Button
          type="button"
          onClick={downloadWordPressPackage}
          disabled={status === "downloading"}
          className="h-10 gap-2 px-4 font-semibold"
        >
          {status === "downloading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : status === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {status === "downloading" ? "패키지 생성 중..." : "WordPress 사이트 패키지 다운로드"}
        </Button>
      </div>

      {status === "success" && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          WordPress에서 바로 설치 가능: Elementor JSON, 매물 관리 플러그인 ZIP, README가 포함되어 있습니다.
        </div>
      )}
      {status === "error" && (
        <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}

export function LandingPreviewRenderer({ site, projectId }: { site: GeneratedSiteData; projectId: string }) {
  const [mode, setMode] = useState<PreviewMode>("desktop");
  const wrapperWidth = mode === "mobile" ? "max-w-[390px]" : "max-w-5xl";
  const compact = mode === "mobile";
  const hero = site.sections.find((section) => section.type === "hero");

  return (
    <div className="space-y-4">
      <GeneratedSiteExportControls projectId={projectId} />
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">랜딩페이지 미리보기</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              저장된 GeneratedSiteData를 렌더링한 목업 프리뷰입니다.
            </p>
          </div>
          <div className="inline-flex rounded-lg border bg-background p-1">
            <Button type="button" size="sm" variant={mode === "desktop" ? "default" : "ghost"} onClick={() => setMode("desktop")} className="gap-1.5">
              <Monitor className="h-3.5 w-3.5" />
              데스크톱
            </Button>
            <Button type="button" size="sm" variant={mode === "mobile" ? "default" : "ghost"} onClick={() => setMode("mobile")} className="gap-1.5">
              <Smartphone className="h-3.5 w-3.5" />
              모바일
            </Button>
          </div>
        </div>

        <div className={cn("mx-auto overflow-hidden rounded-2xl border bg-white shadow-sm", wrapperWidth)}>
          <div
            className={cn("text-slate-900", site.typography.styleId === "compact-modern" && "text-[15px]")}
            style={{ backgroundColor: site.colors.surface }}
          >
            <header className="flex items-center justify-between gap-4 border-b bg-white/85 px-5 py-4">
              <div>
                <p className="text-sm font-bold" style={{ color: site.colors.primary }}>
                  {site.footer.brandName}
                </p>
                <p className="text-xs text-slate-500">{site.layout.name}</p>
              </div>
              {!compact && (
                <nav className="flex gap-4 text-xs font-medium text-slate-600">
                  {site.navigation.slice(0, 4).map((item) => (
                    <span key={item.href}>{item.label}</span>
                  ))}
                </nav>
              )}
              <Button size="sm" style={{ backgroundColor: site.colors.accent }}>
                <Phone className="mr-1.5 h-3.5 w-3.5" />
                {site.cta.primaryLabel}
              </Button>
            </header>

            <div className={cn("grid gap-6 px-5 py-8", compact ? "grid-cols-1" : "grid-cols-[1.1fr_0.9fr]", site.layout.styleId === "listing-first" && !compact && "grid-cols-[0.9fr_1.1fr]")}>
              <section className={cn(site.layout.styleId === "listing-first" && !compact && "order-2")}>
                <Badge variant="secondary">{site.seo.title}</Badge>
                <h1
                  className={cn("mt-4 font-bold leading-tight", compact ? "text-3xl" : "text-5xl", site.typography.styleId === "editorial-serif" && "font-serif")}
                  style={{ color: site.colors.primary }}
                >
                  {hero?.title}
                </h1>
                <p className="mt-4 text-base leading-relaxed text-slate-600">{hero?.body}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Button style={{ backgroundColor: site.colors.accent }}>{site.cta.primaryLabel}</Button>
                  <Button variant="outline">{site.cta.secondaryLabel}</Button>
                </div>
              </section>

              <aside className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold" style={{ color: site.colors.primary }}>
                  생성 사이트 구조
                </p>
                <div className="mt-4 space-y-3">
                  {site.sections.slice(0, 5).map((section, index) => (
                    <div key={section.id} className="flex items-center gap-3 rounded-xl border p-3 text-sm">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-white" style={{ backgroundColor: site.colors.primary }}>
                        {index + 1}
                      </span>
                      {section.title}
                    </div>
                  ))}
                </div>
              </aside>
            </div>

            <section className="bg-white px-5 py-7">
              <div className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-3")}>
                {site.trustItems.slice(0, 3).map((item, index) => (
                  <div key={`${item}-${index}`} className="rounded-xl border p-4">
                    <ShieldCheck className="h-5 w-5" style={{ color: site.colors.accent }} />
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            {site.layout.showPropertyCards && (
              <section className="px-5 py-7">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: site.colors.accent }}>추천 매물</p>
                    <h2 className="text-2xl font-bold" style={{ color: site.colors.primary }}>
                      {site.sections.find((section) => section.type === "properties")?.title}
                    </h2>
                  </div>
                  {!compact && <Badge variant="outline">{site.cards.length}개 카드</Badge>}
                </div>
                <div className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-3")}>
                  {site.cards.map((card) => (
                    <article key={card.title} className="rounded-2xl bg-white p-4 shadow-sm">
                      <div className="mb-3 h-28 rounded-xl" style={{ background: `linear-gradient(135deg, ${site.colors.primary}20, ${site.colors.accent}25)` }} />
                      <p className="text-sm font-bold">{card.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{card.meta}</p>
                      <p className="mt-3 font-semibold" style={{ color: site.colors.primary }}>{card.price}</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.body}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section className="bg-white px-5 py-7">
              <div className={cn("grid gap-4", compact ? "grid-cols-1" : "grid-cols-[0.9fr_1.1fr]")}>
                <div className="rounded-2xl p-5 text-white" style={{ backgroundColor: site.colors.primary }}>
                  <h2 className="text-2xl font-bold">{site.cta.headline}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-white/75">{site.cta.body}</p>
                  <Button className="mt-5" style={{ backgroundColor: site.colors.accent }}>지금 상담 요청</Button>
                </div>
                {site.layout.showInquiryForm && (
                  <form className="rounded-2xl border bg-white p-5">
                    <p className="font-semibold">{site.form.title}</p>
                    <div className="mt-4 grid gap-3">
                      {site.form.fields.map((field) => (
                        <div key={field} className="rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-500">{field}</div>
                      ))}
                    </div>
                    <Button type="button" className="mt-4 w-full" style={{ backgroundColor: site.colors.accent }}>
                      {site.form.submitLabel}
                    </Button>
                  </form>
                )}
              </div>
            </section>

            {site.layout.showMap && (
              <section className="px-5 py-7">
                <div className="rounded-2xl border bg-white p-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" style={{ color: site.colors.accent }} />
                    <h2 className="font-bold" style={{ color: site.colors.primary }}>
                      {site.sections.find((section) => section.type === "map")?.title}
                    </h2>
                  </div>
                  <div className="mt-4 grid min-h-52 place-items-center rounded-xl border border-dashed" style={{ backgroundColor: site.colors.surface }}>
                    <div className="text-center">
                      <MapPin className="mx-auto h-8 w-8" style={{ color: site.colors.primary }} />
                      <p className="mt-2 text-sm font-medium">지도 기반 탐색 영역</p>
                      <p className="mt-1 text-xs text-slate-500">{site.sections.find((section) => section.type === "map")?.body}</p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <footer className="px-5 py-6 text-sm text-white" style={{ backgroundColor: site.colors.primary }}>
              <div className={cn("flex gap-3", compact ? "flex-col" : "items-center justify-between")}>
                <div>
                  <p className="font-semibold">{site.footer.brandName}</p>
                  <p className="mt-1 text-white/65">{site.footer.description}</p>
                </div>
                <p className="text-white/65">{site.footer.note}</p>
              </div>
            </footer>
          </div>
        </div>
      </section>
    </div>
  );
}
