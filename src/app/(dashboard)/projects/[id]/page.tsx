import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin, Home, ArrowLeftRight, Users, FileText, Eye, CheckCircle2, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProjectService } from "@/services/project.service";
import { GenerationWorkflowService } from "@/services/generation-workflow.service";
import { Badge } from "@/components/ui/badge";
import { MultiAgentWorkflowPanel } from "@/components/workflow/multi-agent-workflow-panel";
import type { ProjectConfig } from "@/config/project-options";
import type { GeneratedContent } from "@/types/generation.types";
import type { WorkflowSnapshot } from "@/types/workflow.types";
import { WORKFLOW_STEPS } from "@/config/workflow-steps";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "프로젝트 상세" };

const STATUS_MAP = {
  draft:     { label: "초안",   variant: "outline"   },
  published: { label: "게시됨", variant: "default"   },
  archived:  { label: "보관됨", variant: "secondary" },
} as const;

const CONFIG_FIELDS = [
  { key: "region",          label: "지역",       icon: MapPin         },
  { key: "propertyType",    label: "매물 유형",  icon: Home           },
  { key: "transactionType", label: "거래 유형",  icon: ArrowLeftRight },
  { key: "targetAudience",  label: "타깃 고객",  icon: Users          },
  { key: "purpose",         label: "사이트 목적", icon: FileText      },
] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const service = new ProjectService(supabase);
  const project = await service.getProjectById(id);
  if (!project || project.user_id !== user.id) notFound();

  const rawConfig = (project.config ?? {}) as Record<string, unknown>;
  const { generatedContent, ...cfgFields } = rawConfig;
  delete cfgFields.generatedSiteData;
  delete cfgFields.generatedAt;
  const cfg = cfgFields as ProjectConfig;
  const initialContent = (generatedContent as GeneratedContent | undefined) ?? undefined;
  const status = STATUS_MAP[project.status] ?? STATUS_MAP.draft;
  let initialWorkflow: WorkflowSnapshot = { run: null, steps: [], artifacts: [] };

  try {
    const workflowService = new GenerationWorkflowService(supabase);
    const latestRun = await workflowService.getLatestProjectRun(project.id);
    if (latestRun) {
      const [steps, artifacts] = await Promise.all([
        workflowService.getRunSteps(latestRun.id),
        workflowService.getRunArtifacts(latestRun.id),
      ]);
      initialWorkflow = { run: latestRun, steps, artifacts };
    }
  } catch {
    initialWorkflow = { run: null, steps: [], artifacts: [] };
  }

  const completedSteps = initialWorkflow.steps.filter((step) => step.status === "completed").length;
  const isComplete = initialWorkflow.run?.status === "completed";

  return (
    <div className="p-6 lg:p-8">
      {/* 브레드크럼 */}
      <div className="mb-6">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          프로젝트 목록
        </Link>
      </div>

      <div className="mx-auto max-w-6xl space-y-6">
        {/* 헤더 카드 */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
                <Badge variant="secondary">부동산</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                생성일: {formatDate(project.created_at)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={status.variant} className="shrink-0 px-3 py-1 text-sm">
                {status.label}
              </Badge>
              <Link
                href={`/projects/${project.id}/preview`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                <Eye className="h-3.5 w-3.5" />
                미리보기
              </Link>
              {isComplete && (
                <a
                  href={`/api/projects/${project.id}/wordpress-package`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Download className="h-3.5 w-3.5" />
                  WordPress 패키지 다운로드
                </a>
              )}
            </div>
          </div>
        </div>

        {isComplete && (
          <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h2 className="font-semibold">웹사이트 초안이 준비되었습니다.</h2>
              <p className="mt-1 text-sm text-emerald-800/80">
                미리보기 페이지에서 데스크톱/모바일 화면을 확인하고, 다음 단계에서 내보내기를 연결할 수 있습니다.
              </p>
            </div>
          </div>
        )}

        {/* 프로젝트 정보 */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold">프로젝트 정보</h2>
            <div className="text-sm text-muted-foreground">
              워크플로우 {completedSteps}/{WORKFLOW_STEPS.length} 완료
            </div>
          </div>
          <dl className="space-y-4">
            {CONFIG_FIELDS.map(({ key, label, icon: Icon }) => {
              const value = cfg[key];
              if (!value) return null;
              return (
                <div key={key} className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                    <dd className="mt-0.5 text-sm font-medium leading-relaxed">{value}</dd>
                  </div>
                </div>
              );
            })}
          </dl>
        </div>

        {/* AI 생성 패널 (클라이언트 컴포넌트) */}
        <MultiAgentWorkflowPanel
          projectId={project.id}
          initialWorkflow={initialWorkflow}
          config={cfg}
          initialContent={initialContent}
        />
      </div>
    </div>
  );
}
