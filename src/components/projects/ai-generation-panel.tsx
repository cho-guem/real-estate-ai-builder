"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  MapPin,
  BarChart2,
  SearchCode,
  LayoutTemplate,
  ClipboardList,
  AlertCircle,
  RefreshCw,
  KeyRound,
  Eye,
  X,
  Download,
  Code2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { LandingPagePreview } from "@/components/projects/landing-page-preview";
import { downloadLandingPageHtml, copyWordPressEmbed } from "@/lib/html-export";
import { cn } from "@/lib/utils";
import type { ProjectConfig } from "@/config/project-options";
import type { GeneratedContent, GenerateApiResult } from "@/types/generation.types";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

type StepId = "region" | "benchmark" | "seo" | "structure" | "report";

const STEPS: { id: StepId; label: string; icon: React.ElementType; ms: number }[] = [
  { id: "region",    label: "지역 분석",        icon: MapPin,         ms: 800   },
  { id: "benchmark", label: "벤치마킹 요약",    icon: BarChart2,      ms: 1800  },
  { id: "seo",       label: "SEO 문구 생성",    icon: SearchCode,     ms: 2800  },
  { id: "structure", label: "사이트 구조 설계", icon: LayoutTemplate, ms: 3800  },
  { id: "report",    label: "검토 리포트 작성", icon: ClipboardList,  ms: 4600  },
];

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function StepRow({
  label,
  icon: Icon,
  done,
  active,
}: {
  label: string;
  icon: React.ElementType;
  done: boolean;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 text-sm transition-colors",
        done ? "text-foreground" : "text-muted-foreground"
      )}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all",
          done
            ? "border-primary bg-primary/10"
            : active
            ? "border-primary/50 bg-primary/5"
            : "border-border bg-muted/30"
        )}
      >
        {done ? (
          <CheckCircle2 className="h-4 w-4 text-primary" />
        ) : active ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        ) : (
          <Icon className="h-3.5 w-3.5" />
        )}
      </div>
      <span className={cn("font-medium", active && !done && "text-primary")}>
        {label}
      </span>
      {done && <span className="ml-auto text-xs text-primary">완료</span>}
    </div>
  );
}

function ResultCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main panel
// ─────────────────────────────────────────────

export function AiGenerationPanel({
  projectId,
  config,
  initialContent,
}: {
  projectId: string;
  config: ProjectConfig;
  initialContent?: GeneratedContent;
}) {
  type Status = "idle" | "generating" | "done" | "error";

  const [status, setStatus] = useState<Status>(initialContent ? "done" : "idle");
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(
    initialContent ? new Set(STEPS.map((s) => s.id)) : new Set()
  );
  const [content, setContent] = useState<GeneratedContent | null>(initialContent ?? null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [errorCode, setErrorCode] = useState<string>("");
  const [wpCopied, setWpCopied] = useState(false);

  // Keep timer refs so we can clear them on re-generate
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
  }

  // Cancel timers if component unmounts mid-generation
  useEffect(() => () => clearTimers(), []);

  async function handleGenerate() {
    clearTimers();
    setStatus("generating");
    setCompletedSteps(new Set());
    setErrorMsg("");
    setErrorCode("");

    // Animate steps optimistically — timings are approximate for typical API latency
    STEPS.forEach((step) => {
      const t = setTimeout(() => {
        setCompletedSteps((prev) => new Set([...prev, step.id]));
      }, step.ms);
      timerRefs.current.push(t);
    });

    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
      });

      const data: GenerateApiResult = await res.json();

      // Stop any remaining step timers — mark all as done immediately
      clearTimers();
      setCompletedSteps(new Set(STEPS.map((s) => s.id)));

      if (!data.ok) {
        setErrorMsg(data.error);
        setErrorCode(data.code ?? "");
        setStatus("error");
        return;
      }

      setContent(data.content);
      setStatus("done");
    } catch {
      clearTimers();
      setErrorMsg("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
      setErrorCode("api_error");
      setStatus("error");
    }
  }

  const activeStepId = STEPS.find((s) => !completedSteps.has(s.id))?.id ?? null;

  // ── Idle ──────────────────────────────────
  if (status === "idle") {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">AI 웹사이트 생성</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              입력한 프로젝트 정보를 바탕으로 AI가 분석·설계 결과를 생성합니다.
            </p>
          </div>
          <Button onClick={handleGenerate} className="shrink-0 gap-2">
            <Sparkles className="h-4 w-4" />
            AI 생성 시작
          </Button>
        </div>
      </div>
    );
  }

  // ── Generating ────────────────────────────
  if (status === "generating") {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
        <div className="mb-5 flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <h2 className="font-semibold text-primary">AI 분석 진행 중...</h2>
        </div>
        <div className="space-y-3">
          {STEPS.map((step) => (
            <StepRow
              key={step.id}
              label={step.label}
              icon={step.icon}
              done={completedSteps.has(step.id)}
              active={step.id === activeStepId}
            />
          ))}
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          Claude AI가 프로젝트를 분석하고 있습니다. 잠시만 기다려주세요.
        </p>
      </div>
    );
  }

  // ── Error ──────────────────────────────────
  if (status === "error") {
    const isMissingKey = errorCode === "missing_key";
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <div className="mb-4 flex items-start gap-3">
          {isMissingKey ? (
            <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          )}
          <div className="flex-1">
            <h2 className="font-semibold text-destructive">
              {isMissingKey ? "API 키 설정 필요" : "생성 오류"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{errorMsg}</p>
            {isMissingKey && (
              <p className="mt-2 text-xs text-muted-foreground">
                <code className="rounded bg-muted px-1 py-0.5">.env.local</code>에{" "}
                <code className="rounded bg-muted px-1 py-0.5">ANTHROPIC_API_KEY</code>를
                설정한 후 개발 서버를 재시작하세요.
              </p>
            )}
          </div>
        </div>
        {!isMissingKey && (
          <Button variant="outline" size="sm" onClick={handleGenerate} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            다시 시도
          </Button>
        )}
      </div>
    );
  }

  // ── Done ──────────────────────────────────
  if (!content) return null;

  return (
    <div className="space-y-4">
      {/* 완료 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-6 py-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <span className="font-semibold text-primary">AI 생성 완료</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Landing page preview dialog */}
          <Dialog>
            <DialogTrigger
              render={
                <Button variant="default" size="sm" className="gap-1.5" />
              }
            >
              <Eye className="h-3.5 w-3.5" />
              랜딩페이지 미리보기
            </DialogTrigger>
            <DialogContent
              showCloseButton={false}
              className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
            >
              {/* sticky header */}
              <div className="flex shrink-0 items-start justify-between gap-4 border-b bg-background px-5 py-4">
                <div>
                  <DialogTitle className="text-base font-semibold">
                    랜딩페이지 미리보기
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 text-xs">
                    AI가 생성한 콘텐츠로 구성한 미리보기입니다. 외부에 게시되지 않습니다.
                  </DialogDescription>
                </div>
                <DialogClose
                  render={<Button variant="ghost" size="icon-sm" className="shrink-0" />}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">닫기</span>
                </DialogClose>
              </div>
              {/* scrollable preview body */}
              <div className="overflow-y-auto">
                <LandingPagePreview content={content} config={config} />
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={async () => {
              const ok = await copyWordPressEmbed(content, config, projectId);
              if (ok) {
                setWpCopied(true);
                setTimeout(() => setWpCopied(false), 2500);
              }
            }}
          >
            {wpCopied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-600">복사됨!</span>
              </>
            ) : (
              <>
                <Code2 className="h-3.5 w-3.5" />
                WordPress 코드 복사
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => downloadLandingPageHtml(content, config, projectId)}
          >
            <Download className="h-3.5 w-3.5" />
            HTML 다운로드
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            className="gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            다시 생성
          </Button>
        </div>
      </div>

      {/* 지역 분석 */}
      <ResultCard title={content.region.title} icon={MapPin}>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {content.region.body}
        </p>
      </ResultCard>

      {/* 벤치마킹 */}
      <ResultCard title={content.benchmark.title} icon={BarChart2}>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {content.benchmark.body}
        </p>
      </ResultCard>

      {/* SEO 문구 */}
      <ResultCard title={content.seo.title} icon={SearchCode}>
        <dl className="space-y-3">
          {content.seo.rows.map((row) => (
            <div key={row.label}>
              <dt className="text-xs font-semibold text-muted-foreground">{row.label}</dt>
              <dd className="mt-0.5 text-sm font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      </ResultCard>

      {/* 사이트 구조 */}
      <ResultCard title={content.structure.title} icon={LayoutTemplate}>
        <ol className="space-y-1.5">
          {content.structure.pages.map((page, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              {page}
            </li>
          ))}
        </ol>
      </ResultCard>

      {/* 검토 리포트 */}
      <ResultCard title={content.report.title} icon={ClipboardList}>
        <div className="mb-3 flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">종합 점수</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-primary">{content.report.score}</span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {content.report.body}
        </p>
      </ResultCard>
    </div>
  );
}
