"use client";

import { useState } from "react";
import { CheckCircle2, Clipboard, Download, FileCode2, FileJson, Globe2, HelpCircle, MapPin, Monitor, Phone, ShieldCheck, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { renderGeneratedSiteHtml } from "@/lib/generated-site";
import {
  buildElementorExportDebug,
  mapGeneratedSiteToElementor,
  mapGeneratedSiteToMinimalElementorTest,
  renderElementorImportInstructions,
} from "@/lib/elementor-export";
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

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function GeneratedSiteExportControls({ site }: { site: GeneratedSiteData }) {
  const [copied, setCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const elementorJson = mapGeneratedSiteToElementor(site);
  const minimalElementorJson = mapGeneratedSiteToMinimalElementorTest(site);
  const elementorDebugJson = buildElementorExportDebug(site);

  async function copyPrompt() {
    await navigator.clipboard.writeText(site.exports.structuredPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold">내보내기</h3>
          <p className="text-sm text-muted-foreground">GeneratedSiteData 기준으로 내보내기 파일을 준비합니다.</p>
        </div>
        <Button type="button" disabled className="gap-1.5">
          <Globe2 className="h-3.5 w-3.5" />
          Publish Website
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => downloadText("generated-site.json", JSON.stringify(site, null, 2), "application/json")}
          className="gap-1.5"
        >
          <FileJson className="h-3.5 w-3.5" />
          Export JSON
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => downloadText("mock-landing.html", renderGeneratedSiteHtml(site), "text/html")}
          className="gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Download mock HTML
        </Button>
        <Button type="button" variant="outline" onClick={copyPrompt} className="gap-1.5">
          {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy structured prompt"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => downloadText("elementor-page.json", JSON.stringify(elementorJson, null, 2), "application/json")}
          className="gap-1.5"
        >
          <FileCode2 className="h-3.5 w-3.5" />
          Export Safe Elementor JSON
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => downloadText("elementor-minimal-test.json", JSON.stringify(minimalElementorJson, null, 2), "application/json")}
          className="gap-1.5"
        >
          <FileCode2 className="h-3.5 w-3.5" />
          Export Minimal Test JSON
        </Button>
        <Button type="button" variant="outline" onClick={() => setShowInstructions(true)} className="gap-1.5">
          <HelpCircle className="h-3.5 w-3.5" />
          WordPress import instructions
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => downloadText("elementor-export-debug.json", JSON.stringify(elementorDebugJson, null, 2), "application/json")}
          className="gap-1.5"
        >
          <FileJson className="h-3.5 w-3.5" />
          Export Debug JSON
        </Button>
        <Button type="button" variant="outline" disabled>
          Future WordPress API export
        </Button>
      </div>

      {showInstructions && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-4">
          <div className="w-full max-w-lg rounded-xl border bg-background p-5 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="font-semibold">WordPress Elementor 가져오기 안내</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  현재는 파일 내보내기만 지원합니다. 실제 WordPress API 연결은 이후 단계에서 추가됩니다.
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowInstructions(false)}>
                닫기
              </Button>
            </div>
            <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
              {renderElementorImportInstructions().map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

export function LandingPreviewRenderer({ site }: { site: GeneratedSiteData }) {
  const [mode, setMode] = useState<PreviewMode>("desktop");
  const wrapperWidth = mode === "mobile" ? "max-w-[390px]" : "max-w-5xl";
  const compact = mode === "mobile";
  const hero = site.sections.find((section) => section.type === "hero");

  return (
    <div className="space-y-4">
      <GeneratedSiteExportControls site={site} />
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
