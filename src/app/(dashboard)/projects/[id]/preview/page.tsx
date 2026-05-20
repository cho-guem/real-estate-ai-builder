import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Link2, RefreshCw, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProjectService } from "@/services/project.service";
import { GenerationWorkflowService } from "@/services/generation-workflow.service";
import { LandingPreviewRenderer } from "@/components/workflow/landing-preview-renderer";
import { Badge } from "@/components/ui/badge";
import { WORKFLOW_STEPS } from "@/config/workflow-steps";
import { buildGeneratedSiteData, isGeneratedSiteData } from "@/lib/generated-site";
import type { ProjectConfig } from "@/config/project-options";

interface PreviewPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "웹사이트 미리보기" };

export default async function ProjectPreviewPage({ params }: PreviewPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const projectService = new ProjectService(supabase);
  const project = await projectService.getProjectById(id);
  if (!project || project.user_id !== user.id) notFound();

  const workflowService = new GenerationWorkflowService(supabase);
  const latestRun = await workflowService.getLatestProjectRun(project.id);
  const steps = latestRun ? await workflowService.getRunSteps(latestRun.id) : [];
  const artifacts = latestRun ? await workflowService.getRunArtifacts(latestRun.id) : [];
  const artifactByType = new Map(artifacts.map((artifact) => [artifact.artifact_type, artifact]));
  const landingStepIndex = WORKFLOW_STEPS.findIndex((step) => step.key === "landing_page");
  const preLandingSteps = WORKFLOW_STEPS.slice(0, landingStepIndex);
  const stepByKey = new Map(steps.map((step) => [step.step_key, step]));
  const isLandingCompleted =
    preLandingSteps.every((step) => stepByKey.get(step.key)?.status === "completed") &&
    stepByKey.get("landing_page")?.status === "completed";
  const cfg = (project.config ?? {}) as ProjectConfig;
  const projectConfig = project.config && typeof project.config === "object" && !Array.isArray(project.config)
    ? (project.config as Record<string, unknown>)
    : {};
  const landingArtifact = artifactByType.get("landing_page");
  const landingData = landingArtifact?.data && typeof landingArtifact.data === "object" && !Array.isArray(landingArtifact.data)
    ? (landingArtifact.data as Record<string, unknown>)
    : {};
  const generatedSite = isGeneratedSiteData(projectConfig.generatedSiteData)
    ? projectConfig.generatedSiteData
    : isGeneratedSiteData(landingData.generatedSite)
      ? landingData.generatedSite
      : isLandingCompleted
        ? buildGeneratedSiteData({
            artifacts,
            config: cfg,
            projectName: project.name,
            workflowRunId: latestRun?.id,
          })
        : null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href={`/projects/${project.id}`}
            className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            워크플로우로 돌아가기
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">웹사이트 미리보기</h1>
            <Badge variant="secondary">부동산</Badge>
            {isLandingCompleted && <Badge>생성 완료</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            승인된 워크플로우 산출물로 만든 랜딩페이지 초안을 확인합니다.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium text-muted-foreground opacity-70"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            재생성 준비 중
          </button>
          <button
            type="button"
            disabled
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium text-muted-foreground opacity-70"
          >
            <Link2 className="h-3.5 w-3.5" />
            공유 링크 준비 중
          </button>
          <button
            type="button"
            disabled
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium text-muted-foreground opacity-70"
          >
            <Download className="h-3.5 w-3.5" />
            내보내기 준비 중
          </button>
        </div>
      </div>

      {isLandingCompleted ? (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            데스크톱/모바일 토글로 생성된 초안을 확인할 수 있습니다. 다운로드, 재생성, 공유 기능은 다음 단계에서 연결됩니다.
          </div>
          {generatedSite ? (
            <LandingPreviewRenderer site={generatedSite} projectId={project.id} />
          ) : (
            <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
              생성 사이트 데이터를 불러오지 못했습니다. 워크플로우에서 랜딩페이지를 다시 생성해주세요.
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="font-semibold">아직 미리보기를 사용할 수 없습니다</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            랜딩페이지 생성 단계가 완료되면 이 페이지에서 실제 웹사이트 초안을 확인할 수 있습니다.
          </p>
          <Link
            href={`/projects/${project.id}`}
            className="mt-6 inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            워크플로우 계속하기
          </Link>
        </div>
      )}
    </div>
  );
}
