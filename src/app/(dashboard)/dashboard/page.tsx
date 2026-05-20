import type { Metadata } from "next";
import type { Route } from "next";
import React from "react";
import Link from "next/link";
import { TrendingUp, Globe, Sparkles, ArrowRight, Plus, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProjectService } from "@/services/project.service";
import { GenerationWorkflowService } from "@/services/generation-workflow.service";
import { Badge } from "@/components/ui/badge";
import { ProjectDeleteButton } from "@/components/projects/project-delete-button";
import { WORKFLOW_STEPS } from "@/config/workflow-steps";
import type { ProjectConfig } from "@/config/project-options";

export const metadata: Metadata = { title: "대시보드" };

function workflowProgress(completedSteps: number) {
  const total = WORKFLOW_STEPS.length;
  return {
    total,
    percent: total === 0 ? 0 : Math.round((completedSteps / total) * 100),
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const fullName: string = user?.user_metadata?.full_name ?? user?.email ?? "";
  const firstName = fullName.split(" ")[0] || fullName.split("@")[0];

  const service = new ProjectService(supabase);
  const projects = user ? await service.getUserProjects(user.id) : [];
  const workflowService = new GenerationWorkflowService(supabase);
  const projectSummaries = await Promise.all(
    projects.slice(0, 6).map(async (project) => {
      const latestRun = await workflowService.getLatestProjectRun(project.id);
      const steps = latestRun ? await workflowService.getRunSteps(latestRun.id) : [];
      const completedSteps = steps.filter((step) => step.status === "completed").length;
      return {
        project,
        run: latestRun,
        completedSteps,
        progress: workflowProgress(completedSteps),
      };
    })
  );
  const publishedCount = projects.filter((p) => p.status === "published").length;

  const stats: Array<{ label: string; value: string; description: string; icon: React.ElementType; href: Route<string> }> = [
    {
      label: "총 프로젝트",
      value: String(projects.length),
      description: projects.length === 0 ? "첫 프로젝트를 시작해보세요" : `${projects.length}개의 프로젝트`,
      icon: TrendingUp,
      href: "/projects",
    },
    {
      label: "게시된 사이트",
      value: String(publishedCount),
      description: publishedCount === 0 ? "아직 게시된 사이트가 없어요" : `${publishedCount}개 운영 중`,
      icon: Globe,
      href: "/projects",
    },
    {
      label: "AI 생성 횟수",
      value: "0",
      description: "AI 연동 후 사용 가능해요",
      icon: Sparkles,
      href: "/settings",
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          안녕하세요, {firstName}님 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          오늘도 AI로 부동산 웹사이트를 손쉽게 만들어보세요.
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="group rounded-xl border bg-card p-6 shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-4xl font-bold tracking-tight">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                바로가기 <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* 빠른 시작 배너 */}
      <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">
              {projects.length === 0
                ? "첫 번째 프로젝트를 시작할 준비가 됐나요?"
                : "새 프로젝트를 만들어보세요"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              AI가 부동산 매물 설명, SEO 최적화 문구를 자동으로 생성해드려요.
            </p>
          </div>
          <Link
            href="/projects/new"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            프로젝트 만들기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">최근 프로젝트</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              부동산 웹사이트 제작 진행 상황을 확인하세요.
            </p>
          </div>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            새 프로젝트
          </Link>
        </div>

        {projectSummaries.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">아직 프로젝트가 없습니다</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              첫 부동산 웹사이트 프로젝트를 만들면 진행률이 여기에 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projectSummaries.map(({ project, run, completedSteps, progress }) => {
              const cfg = (project.config ?? {}) as ProjectConfig;
              return (
                <div
                  key={project.id}
                  className="rounded-xl border bg-card p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/projects/${project.id}`} className="block hover:text-primary">
                        <h3 className="font-semibold leading-snug">{project.name}</h3>
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {cfg.region || "지역 미입력"} · {cfg.propertyType || "매물 유형 미입력"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="secondary">부동산</Badge>
                      <ProjectDeleteButton projectId={project.id} projectName={project.name} />
                    </div>
                  </div>
                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">워크플로우 진행률</span>
                      <span className="font-medium">
                        {completedSteps}/{progress.total}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${progress.percent}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {run?.status === "completed"
                        ? "웹사이트 초안이 준비되었습니다."
                        : run
                          ? "워크플로우를 이어서 진행하세요."
                      : "워크플로우를 시작하세요."}
                    </p>
                  </div>
                  <Link
                    href={`/projects/${project.id}`}
                    className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary"
                  >
                    상세 보기 <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
