import type { Metadata } from "next";
import Link from "next/link";
import { Plus, FolderOpen, ChevronRight, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProjectService } from "@/services/project.service";
import { GenerationWorkflowService } from "@/services/generation-workflow.service";
import { Badge } from "@/components/ui/badge";
import { ProjectDeleteButton } from "@/components/projects/project-delete-button";
import { WORKFLOW_STEPS } from "@/config/workflow-steps";
import type { ProjectConfig } from "@/config/project-options";

export const metadata: Metadata = { title: "프로젝트" };

const STATUS_MAP = {
  draft: { label: "초안", variant: "outline" },
  published: { label: "게시됨", variant: "default" },
  archived: { label: "보관됨", variant: "secondary" },
} as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const service = new ProjectService(supabase);
  const projects = user ? await service.getUserProjects(user.id) : [];
  const workflowService = new GenerationWorkflowService(supabase);
  const summaries = await Promise.all(
    projects.map(async (project) => {
      const latestRun = await workflowService.getLatestProjectRun(project.id);
      const steps = latestRun ? await workflowService.getRunSteps(latestRun.id) : [];
      const completedSteps = steps.filter((step) => step.status === "completed").length;
      const percent = Math.round((completedSteps / WORKFLOW_STEPS.length) * 100);
      return { project, latestRun, completedSteps, percent };
    })
  );

  return (
    <div className="p-6 lg:p-8">
      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">프로젝트</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI로 생성한 부동산 웹사이트를 관리하세요
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          새 프로젝트
        </Link>
      </div>

      {projects.length === 0 ? (
        /* 빈 상태 */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <FolderOpen className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground">아직 프로젝트가 없어요</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            새 프로젝트를 만들고 AI로 부동산 웹사이트를 자동 생성해보세요.
          </p>
          <Link
            href="/projects/new"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            첫 프로젝트 시작하기
          </Link>
        </div>
      ) : (
        /* 프로젝트 목록 */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map(({ project, latestRun, completedSteps, percent }) => {
            const cfg = (project.config ?? {}) as ProjectConfig;
            const status = STATUS_MAP[project.status] ?? STATUS_MAP.draft;

            return (
              <article
                key={project.id}
                className="group flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <Link href={`/projects/${project.id}`} className="min-w-0">
                    <h3 className="line-clamp-2 font-semibold leading-snug transition-colors hover:text-primary">
                      {project.name}
                    </h3>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={status.variant}>
                      {status.label}
                    </Badge>
                    <ProjectDeleteButton projectId={project.id} projectName={project.name} />
                  </div>
                </div>
                <Badge variant="secondary" className="mb-3 w-fit gap-1">
                  <Building2 className="h-3 w-3" />
                  부동산
                </Badge>

                <div className="flex-1 space-y-1.5">
                  {cfg.region && (
                    <p className="text-xs text-muted-foreground">
                      📍 {cfg.region}
                    </p>
                  )}
                  {cfg.propertyType && (
                    <p className="text-xs text-muted-foreground">
                      🏠 {cfg.propertyType} · {cfg.transactionType}
                    </p>
                  )}
                  {cfg.targetAudience && (
                    <p className="text-xs text-muted-foreground">
                      👤 {cfg.targetAudience}
                    </p>
                  )}
                </div>

                <div className="mt-4 rounded-lg bg-muted/30 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">워크플로우</span>
                    <span className="font-medium">
                      {completedSteps}/{WORKFLOW_STEPS.length}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-background">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {latestRun?.status === "completed"
                      ? "웹사이트 초안이 준비되었습니다."
                      : latestRun
                        ? "진행 중인 워크플로우"
                        : "워크플로우 시작 전"}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t pt-3">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(project.created_at)}
                  </span>
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex items-center gap-0.5 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    상세 보기 <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
