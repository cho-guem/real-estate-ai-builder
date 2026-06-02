import { NextResponse } from "next/server";
import { WORKFLOW_STEPS } from "@/config/workflow-steps";
import { defaultIndustryPreset } from "@/presets";
import type { ProjectConfig } from "@/config/project-options";
import { getRequestDbAndUser } from "@/lib/supabase/request-user";
import { ProjectService } from "@/services/project.service";
import { GenerationWorkflowService } from "@/services/generation-workflow.service";
import { buildGeneratedSiteData } from "@/lib/generated-site";
import type { Json } from "@/types/database.types";
import type { AgentArtifactType, WorkflowSnapshot } from "@/types/workflow.types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

type WorkflowApiResult =
  | { ok: true; workflow: WorkflowSnapshot }
  | { ok: false; error: string; code?: "auth_error" | "not_found" | "api_error" };

type WorkflowActionRequest =
  | { action: "select_benchmarks"; selectedCandidateIds: string[] }
  | { action: "analyze_custom_benchmark"; customUrl: string }
  | { action: "approve_architecture"; menus: Json }
  | { action: "save_features"; features: Json }
  | { action: "approve_ux_flow"; notes?: string; revisionRequest?: string }
  | { action: "approve_seo"; title: string; metaDescription: string; keywords: string[] }
  | {
      action: "approve_brand";
      positioning: string;
      toneKeywords: string[];
      targetAudience: string;
    }
  | {
      action: "approve_design";
      selectedPaletteId: string;
      selectedTypographyId: string;
      selectedLayoutId: string;
      logoAsset?: string;
      brandImageAsset?: string;
    }
  | { action: "generate_landing" }
  | {
      action: "complete_review";
      checklist: Json;
      score: number;
      issues: string[];
    };

function toJson(data: unknown): Json {
  return data as Json;
}

function buildMockArtifact(
  artifactType: string,
  cfg: ProjectConfig,
  projectName: string
): Json {
  return defaultIndustryPreset.buildArtifact(artifactType as AgentArtifactType, cfg, projectName);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isAgencyRun(run: { metadata: Json }) {
  return isRecord(run.metadata) && run.metadata.workflowKind === "real_estate_agency";
}

function buildCustomBenchmarkCandidate(customUrl: string, cfg: ProjectConfig): Record<string, Json> {
  let host = customUrl;
  try {
    host = new URL(customUrl).hostname.replace(/^www\./, "");
  } catch {
    host = customUrl.replace(/^https?:\/\//, "").split("/")[0] || "custom-reference";
  }

  return {
    id: `custom-${Date.now()}`,
    siteName: `${host} 참고 사이트`,
    category: "사용자 입력 벤치마크",
    previewTone: "직접 분석",
    heroTitle: `${cfg.region} ${cfg.propertyType} 전문 상담`,
    heroSubtitle: "입지, 가격, 조건을 빠르게 비교하고 바로 문의할 수 있는 구조를 제안합니다.",
    heroCopy: `${cfg.region} ${cfg.propertyType} 조건을 한눈에 비교하고 전문가 상담으로 바로 연결합니다.`,
    ctaLabel: "이 스타일로 제작",
    ctaStyle: "상단과 하단에 동일한 상담 CTA를 반복 배치하는 전환형 버튼 구조",
    sectionStructure: ["히어로", "추천 매물", "지역 분석", "상담 CTA", "문의 폼"],
    menuStructure: ["홈", "추천 매물", "지역 분석", "상담 문의"],
    colorTone: "짙은 네이비와 따뜻한 오렌지 CTA를 조합한 신뢰형 톤",
    layoutPattern: "좌측 신뢰 카피, 우측 추천 매물/문의 카드가 결합된 전환형 히어로",
    layoutNotes: "첫 화면에서는 핵심 카피와 문의 버튼을 먼저 보여주고, 아래에는 추천 매물과 지역 분석을 순차 배치합니다.",
    description: "입력한 URL의 첫 화면 흐름을 기준으로 신뢰 문구, CTA 위치, 카드형 섹션 구조를 유사하게 재구성합니다.",
    whyUseful: "사용자가 선호하는 실제 사이트 톤을 이후 사이트 구조, 디자인, 랜딩 생성 단계에 반영할 수 있습니다.",
    strengths: ["사용자 선호 스타일을 직접 반영", "히어로/CTA 구조를 빠르게 복제 가능", "브랜드 톤 기준점이 명확함"],
    weaknesses: ["실제 크롤링 대신 목업 분석으로 구조를 추정합니다", "이미지와 로고는 별도 업로드가 필요합니다"],
    borrow: ["히어로 카피 흐름", "CTA 위치", "섹션 순서", "카드형 정보 구조"],
    fitScore: 95,
    websiteUrl: customUrl,
  };
}

function readText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readTextArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function buildBenchmarkReference(
  candidate: Record<string, Json | undefined> | null,
  source: "candidate" | "custom_url" = "candidate"
) {
  const siteName = readText(candidate?.siteName) || (source === "custom_url" ? "입력한 URL" : "선택한 벤치마크");
  const benchmarkUrl = readText(candidate?.websiteUrl);
  const id = readText(candidate?.id);

  return {
    selectedBenchmarkId: id,
    selectedBenchmarkName: siteName,
    selectedBenchmarkSource: source,
    benchmarkUrl,
    benchmarkNotes: readText(candidate?.whyUseful) || readText(candidate?.description) || `${siteName}의 구조를 참고합니다.`,
    heroCopy: readText(candidate?.heroCopy) || readText(candidate?.heroTitle),
    ctaStyle: readText(candidate?.ctaStyle) || readText(candidate?.ctaLabel),
    sectionStructure: readTextArray(candidate?.sectionStructure),
    menuStructure: readTextArray(candidate?.menuStructure),
    colorTone: readText(candidate?.colorTone),
    layoutNotes: readText(candidate?.layoutNotes) || readText(candidate?.layoutPattern),
  };
}

async function getRunArtifactByType(
  service: GenerationWorkflowService,
  runId: string,
  artifactType: string
) {
  const artifacts = await service.getRunArtifacts(runId);
  return artifacts.find((artifact) => artifact.artifact_type === artifactType) ?? null;
}

async function loadWorkflow(
  service: GenerationWorkflowService,
  projectId: string
): Promise<WorkflowSnapshot> {
  const runs = await service.getProjectRuns(projectId);
  const run = runs.find((candidate) => !isAgencyRun(candidate)) ?? null;
  if (!run) return { run: null, steps: [], artifacts: [] };

  const [steps, artifacts] = await Promise.all([
    service.getRunSteps(run.id),
    service.getRunArtifacts(run.id),
  ]);

  return { run, steps, artifacts };
}

function mergeArtifactData(current: Json, patch: Record<string, unknown>): Json {
  const base = current && typeof current === "object" && !Array.isArray(current) ? current : {};
  return { ...(base as Record<string, Json | undefined>), ...patch } as Json;
}

async function getAuthedProject(id: string) {
  const { db: supabase, user } = await getRequestDbAndUser();

  const projectService = new ProjectService(supabase);
  const project = await projectService.getProjectById(id);
  return { supabase, user, project };
}

export async function GET(
  _request: Request,
  { params }: RouteParams
): Promise<NextResponse<WorkflowApiResult>> {
  const { id } = await params;
  const { supabase, user, project } = await getAuthedProject(id);

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "로그인이 필요합니다.", code: "auth_error" },
      { status: 401 }
    );
  }

  if (!project || project.user_id !== user.id) {
    return NextResponse.json(
      { ok: false, error: "프로젝트를 찾을 수 없습니다.", code: "not_found" },
      { status: 404 }
    );
  }

  const workflowService = new GenerationWorkflowService(supabase);
  const workflow = await loadWorkflow(workflowService, id);
  return NextResponse.json({ ok: true, workflow });
}

export async function POST(
  _request: Request,
  { params }: RouteParams
): Promise<NextResponse<WorkflowApiResult>> {
  const { id } = await params;
  const { supabase, user, project } = await getAuthedProject(id);

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "로그인이 필요합니다.", code: "auth_error" },
      { status: 401 }
    );
  }

  if (!project || project.user_id !== user.id) {
    return NextResponse.json(
      { ok: false, error: "프로젝트를 찾을 수 없습니다.", code: "not_found" },
      { status: 404 }
    );
  }

  const cfg = (project.config ?? {}) as ProjectConfig;
  const workflowService = new GenerationWorkflowService(supabase);

  try {
    const run = await workflowService.createRun({
      project_id: project.id,
      user_id: user.id,
      status: "running",
      current_step_key: "benchmark",
      started_at: new Date().toISOString(),
      metadata: {
        mode: "목업",
        note: "프론트엔드 검증용 목업 워크플로우입니다. 실제 AI 호출은 수행하지 않았습니다.",
      },
    });

    for (const [index, stepDef] of WORKFLOW_STEPS.entries()) {
      const step = await workflowService.createStep({
        run_id: run.id,
        project_id: project.id,
        step_key: stepDef.key,
        agent_role: stepDef.agentName,
        status: index === 0 ? "running" : "pending",
        order_index: index,
        input: toJson({ projectConfig: cfg }),
        output: index === 0 ? buildMockArtifact(stepDef.artifactType, cfg, project.name) : null,
        model: "목업",
        input_tokens: 0,
        output_tokens: 0,
        started_at: index === 0 ? new Date().toISOString() : null,
      });

      await workflowService.createArtifact({
        project_id: project.id,
        run_id: run.id,
        step_id: step.id,
        artifact_type: stepDef.artifactType,
        status: "draft",
        version: 1,
        data: buildMockArtifact(stepDef.artifactType, cfg, project.name),
      });
    }

    const workflow = await loadWorkflow(workflowService, id);
    return NextResponse.json({ ok: true, workflow });
  } catch (error) {
    const message = error instanceof Error ? error.message : "워크플로우를 생성하지 못했습니다.";
    return NextResponse.json(
      { ok: false, error: message, code: "api_error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse<WorkflowApiResult>> {
  const { id } = await params;
  const { supabase, user, project } = await getAuthedProject(id);

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "로그인이 필요합니다.", code: "auth_error" },
      { status: 401 }
    );
  }

  if (!project || project.user_id !== user.id) {
    return NextResponse.json(
      { ok: false, error: "프로젝트를 찾을 수 없습니다.", code: "not_found" },
      { status: 404 }
    );
  }

  const body = (await request.json()) as WorkflowActionRequest;
  const workflowService = new GenerationWorkflowService(supabase);
  const runs = await workflowService.getProjectRuns(project.id);
  const run = runs.find((candidate) => !isAgencyRun(candidate)) ?? null;

  if (!run) {
    return NextResponse.json(
      { ok: false, error: "진행 중인 워크플로우가 없습니다.", code: "not_found" },
      { status: 404 }
    );
  }

  try {
    if (body.action === "analyze_custom_benchmark") {
      const artifact = await getRunArtifactByType(workflowService, run.id, "benchmark");
      const benchmarkStep = await workflowService.getRunStep(run.id, "benchmark");
      const customCandidate = buildCustomBenchmarkCandidate(
        body.customUrl,
        project.config as ProjectConfig
      );

      if (artifact) {
        const artifactData =
          artifact.data && typeof artifact.data === "object" && !Array.isArray(artifact.data)
            ? (artifact.data as Record<string, Json | undefined>)
            : {};
        const candidates = Array.isArray(artifactData.candidates) ? artifactData.candidates : [];
        const reference = buildBenchmarkReference(customCandidate, "custom_url");
        const nextData = mergeArtifactData(artifact.data, {
          customBenchmarkUrl: body.customUrl,
          benchmarkUrl: body.customUrl,
          benchmarkUrlAnalysisStatus: "completed",
          selectedCandidateIds: [readText(customCandidate.id)],
          selectedBenchmarkId: reference.selectedBenchmarkId,
          selectedBenchmarkName: reference.selectedBenchmarkName,
          selectedBenchmarkSource: "custom_url",
          selectedBenchmarkStyle: customCandidate,
          selectedCandidates: [customCandidate],
          benchmarkNotes: reference.benchmarkNotes,
          heroCopy: reference.heroCopy,
          ctaStyle: reference.ctaStyle,
          sectionStructure: reference.sectionStructure,
          menuStructure: reference.menuStructure,
          colorTone: reference.colorTone,
          layoutNotes: reference.layoutNotes,
          candidates: [customCandidate, ...candidates],
          customBenchmarkAnalysis: {
            url: body.customUrl,
            status: "completed",
            message: "입력한 벤치마킹 URL을 기준으로 사이트 구조 분석이 완료되었습니다.",
            heroCopy: reference.heroCopy,
            ctaStyle: reference.ctaStyle,
            sectionStructure: reference.sectionStructure,
            menuStructure: reference.menuStructure,
            colorTone: reference.colorTone,
            layoutNotes: reference.layoutNotes,
          },
        });
        await workflowService.updateArtifact(artifact.id, { data: nextData });
        if (benchmarkStep) {
          await workflowService.updateStep(benchmarkStep.id, { output: nextData });
        }
      }
    }

    if (body.action === "select_benchmarks") {
      const artifact = await getRunArtifactByType(workflowService, run.id, "benchmark");
      const benchmarkStep = await workflowService.getRunStep(run.id, "benchmark");
      const strategyStep = await workflowService.getRunStep(run.id, "strategy");
      const architectureStep = await workflowService.getRunStep(run.id, "site_architecture");

      if (artifact) {
        const artifactData =
          artifact.data && typeof artifact.data === "object" && !Array.isArray(artifact.data)
            ? (artifact.data as Record<string, Json | undefined>)
            : {};
        const candidates = Array.isArray(artifactData.candidates)
          ? artifactData.candidates.filter(
              (candidate): candidate is Record<string, Json | undefined> =>
                Boolean(candidate && typeof candidate === "object" && !Array.isArray(candidate))
            )
          : [];
        const selectedCandidates = candidates.filter(
          (candidate) =>
            typeof candidate.id === "string" && body.selectedCandidateIds.includes(candidate.id)
        );
        const primarySelectedCandidate = selectedCandidates[0] ?? null;
        const source = readText(primarySelectedCandidate?.id).startsWith("custom-")
          ? "custom_url"
          : "candidate";
        const reference = buildBenchmarkReference(primarySelectedCandidate, source);
        const approvedBenchmark = mergeArtifactData(artifact.data, {
          selectedCandidateIds: body.selectedCandidateIds,
          selectedBenchmarkId: reference.selectedBenchmarkId,
          selectedBenchmarkName: reference.selectedBenchmarkName,
          selectedBenchmarkSource: reference.selectedBenchmarkSource,
          benchmarkUrl: reference.benchmarkUrl,
          benchmarkNotes: reference.benchmarkNotes,
          heroCopy: reference.heroCopy,
          ctaStyle: reference.ctaStyle,
          sectionStructure: reference.sectionStructure,
          menuStructure: reference.menuStructure,
          colorTone: reference.colorTone,
          layoutNotes: reference.layoutNotes,
          selectedBenchmarkStyle: primarySelectedCandidate,
          selectedCandidates,
          approved: true,
          selectionMessage: "선택한 벤치마킹 스타일이 다음 단계에 반영됩니다.",
        });
        await workflowService.updateArtifact(artifact.id, {
          status: "approved",
          data: approvedBenchmark,
        });
      }
      if (benchmarkStep) {
        await workflowService.updateStep(benchmarkStep.id, {
          status: "completed",
          completed_at: new Date().toISOString(),
        });
      }
      if (strategyStep) {
        await workflowService.updateStep(strategyStep.id, {
          status: "completed",
          started_at: strategyStep.started_at ?? new Date().toISOString(),
          completed_at: new Date().toISOString(),
          output: buildMockArtifact("strategy", project.config as ProjectConfig, project.name),
        });
      }
      if (architectureStep) {
        await workflowService.updateStep(architectureStep.id, {
          status: "running",
          started_at: architectureStep.started_at ?? new Date().toISOString(),
          output: buildMockArtifact("site_architecture", project.config as ProjectConfig, project.name),
        });
      }
      await workflowService.updateRun(run.id, { current_step_key: "site_architecture" });
    }

    if (body.action === "approve_architecture") {
      const artifact = await workflowService.getLatestArtifactByType(project.id, "site_architecture");
      const architectureStep = await workflowService.getRunStep(run.id, "site_architecture");
      const featureStep = await workflowService.getRunStep(run.id, "feature_planning");

      if (artifact) {
        await workflowService.updateArtifact(artifact.id, {
          status: "approved",
          data: mergeArtifactData(artifact.data, { menus: body.menus, approved: true }),
        });
      }
      if (architectureStep) {
        await workflowService.updateStep(architectureStep.id, {
          status: "completed",
          completed_at: new Date().toISOString(),
          output: artifact ? mergeArtifactData(artifact.data, { menus: body.menus, approved: true }) : undefined,
        });
      }
      if (featureStep) {
        await workflowService.updateStep(featureStep.id, {
          status: "running",
          started_at: featureStep.started_at ?? new Date().toISOString(),
          output: buildMockArtifact("feature_planning", project.config as ProjectConfig, project.name),
        });
      }
      await workflowService.updateRun(run.id, { current_step_key: "feature_planning" });
    }

    if (body.action === "save_features") {
      const artifact = await workflowService.getLatestArtifactByType(project.id, "feature_planning");
      const featureStep = await workflowService.getRunStep(run.id, "feature_planning");
      const uxStep = await workflowService.getRunStep(run.id, "ux_flow");

      if (artifact) {
        await workflowService.updateArtifact(artifact.id, {
          status: "approved",
          data: mergeArtifactData(artifact.data, { coreFeatures: body.features, approved: true }),
        });
      }
      if (featureStep) {
        await workflowService.updateStep(featureStep.id, {
          status: "completed",
          completed_at: new Date().toISOString(),
          output: artifact ? mergeArtifactData(artifact.data, { coreFeatures: body.features, approved: true }) : undefined,
        });
      }
      if (uxStep) {
        await workflowService.updateStep(uxStep.id, {
          status: "running",
          started_at: uxStep.started_at ?? new Date().toISOString(),
          output: buildMockArtifact("ux_flow", project.config as ProjectConfig, project.name),
        });
      }
      await workflowService.updateRun(run.id, { current_step_key: "ux_flow" });
    }

    if (body.action === "approve_ux_flow") {
      const artifact = await workflowService.getLatestArtifactByType(project.id, "ux_flow");
      const uxStep = await workflowService.getRunStep(run.id, "ux_flow");
      const seoStep = await workflowService.getRunStep(run.id, "seo");

      if (artifact) {
        await workflowService.updateArtifact(artifact.id, {
          status: "approved",
          data: mergeArtifactData(artifact.data, {
            approved: true,
            notes: body.notes ?? "",
            revisionRequest: body.revisionRequest ?? "",
          }),
        });
      }
      if (uxStep) {
        await workflowService.updateStep(uxStep.id, {
          status: "completed",
          completed_at: new Date().toISOString(),
          output: artifact
            ? mergeArtifactData(artifact.data, {
                approved: true,
                notes: body.notes ?? "",
                revisionRequest: body.revisionRequest ?? "",
              })
            : undefined,
        });
      }
      if (seoStep) {
        await workflowService.updateStep(seoStep.id, {
          status: "running",
          started_at: seoStep.started_at ?? new Date().toISOString(),
          output: buildMockArtifact("seo", project.config as ProjectConfig, project.name),
        });
      }

      await workflowService.updateRun(run.id, { current_step_key: "seo" });
    }

    if (body.action === "approve_seo") {
      const artifact = await workflowService.getLatestArtifactByType(project.id, "seo");
      const seoStep = await workflowService.getRunStep(run.id, "seo");
      const brandStep = await workflowService.getRunStep(run.id, "brand");
      const approvedSeo = artifact
        ? mergeArtifactData(artifact.data, {
            approved: true,
            title: body.title,
            metaDescription: body.metaDescription,
            primaryKeywords: body.keywords,
          })
        : undefined;

      if (artifact && approvedSeo) {
        await workflowService.updateArtifact(artifact.id, {
          status: "approved",
          data: approvedSeo,
        });
      }
      if (seoStep) {
        await workflowService.updateStep(seoStep.id, {
          status: "completed",
          completed_at: new Date().toISOString(),
          output: approvedSeo,
        });
      }
      if (brandStep) {
        await workflowService.updateStep(brandStep.id, {
          status: "running",
          started_at: brandStep.started_at ?? new Date().toISOString(),
          output: buildMockArtifact("brand", project.config as ProjectConfig, project.name),
        });
      }
      await workflowService.updateRun(run.id, { current_step_key: "brand" });
    }

    if (body.action === "approve_brand") {
      const artifact = await workflowService.getLatestArtifactByType(project.id, "brand");
      const brandStep = await workflowService.getRunStep(run.id, "brand");
      const designStep = await workflowService.getRunStep(run.id, "design");
      const approvedBrand = artifact
        ? mergeArtifactData(artifact.data, {
            approved: true,
            positioning: body.positioning,
            toneKeywords: body.toneKeywords,
            audience: body.targetAudience,
          })
        : undefined;

      if (artifact && approvedBrand) {
        await workflowService.updateArtifact(artifact.id, {
          status: "approved",
          data: approvedBrand,
        });
      }
      if (brandStep) {
        await workflowService.updateStep(brandStep.id, {
          status: "completed",
          completed_at: new Date().toISOString(),
          output: approvedBrand,
        });
      }
      if (designStep) {
        await workflowService.updateStep(designStep.id, {
          status: "running",
          started_at: designStep.started_at ?? new Date().toISOString(),
          output: buildMockArtifact("design", project.config as ProjectConfig, project.name),
        });
      }
      await workflowService.updateRun(run.id, { current_step_key: "design" });
    }

    if (body.action === "approve_design") {
      const artifact = await getRunArtifactByType(workflowService, run.id, "design");
      const designStep = await workflowService.getRunStep(run.id, "design");
      const landingStep = await workflowService.getRunStep(run.id, "landing_page");
      const artifactData =
        artifact?.data && typeof artifact.data === "object" && !Array.isArray(artifact.data)
          ? (artifact.data as Record<string, Json | undefined>)
          : {};
      const findSelectedOption = (options: Json | undefined, selectedId: string) => {
        if (!Array.isArray(options)) return null;
        return (
          options.find(
            (option): option is Record<string, Json | undefined> =>
              Boolean(
                option &&
                  typeof option === "object" &&
                  !Array.isArray(option) &&
                  "id" in option &&
                  option.id === selectedId
              )
          ) ?? null
        );
      };
      const selectedPalette = findSelectedOption(artifactData.paletteOptions, body.selectedPaletteId);
      const selectedTypography = findSelectedOption(
        artifactData.typographyOptions,
        body.selectedTypographyId
      );
      const selectedLayout = findSelectedOption(artifactData.layoutOptions, body.selectedLayoutId);
      const approvedDesign = artifact
        ? mergeArtifactData(artifact.data, {
            approved: true,
            selectedPaletteId: body.selectedPaletteId,
            selectedTypographyId: body.selectedTypographyId,
            selectedLayoutId: body.selectedLayoutId,
            selectedPalette,
            selectedTypography,
            selectedLayout,
          })
        : undefined;

      if (artifact && approvedDesign) {
        await workflowService.updateArtifact(artifact.id, {
          status: "approved",
          data: approvedDesign,
        });
      }
      if (designStep) {
        await workflowService.updateStep(designStep.id, {
          status: "completed",
          completed_at: new Date().toISOString(),
          output: approvedDesign,
        });
      }
      if (landingStep) {
        await workflowService.updateStep(landingStep.id, {
          status: "running",
          started_at: landingStep.started_at ?? new Date().toISOString(),
          output: buildMockArtifact("landing_page", project.config as ProjectConfig, project.name),
        });
      }
      await workflowService.updateRun(run.id, { current_step_key: "landing_page" });
    }

    if (body.action === "generate_landing") {
      const artifact = await workflowService.getLatestArtifactByType(project.id, "landing_page");
      const landingStep = await workflowService.getRunStep(run.id, "landing_page");
      const reviewStep = await workflowService.getRunStep(run.id, "review");
      const generatedLandingBase = mergeArtifactData(
        buildMockArtifact("landing_page", project.config as ProjectConfig, project.name),
        { generated: true }
      );
      const runArtifacts = await workflowService.getRunArtifacts(run.id);
      const generatedSite = buildGeneratedSiteData({
        artifacts: runArtifacts.map((item) =>
          item.artifact_type === "landing_page" ? { ...item, data: generatedLandingBase } : item
        ),
        config: project.config as ProjectConfig,
        projectName: project.name,
        workflowRunId: run.id,
      });
      const generatedLanding = mergeArtifactData(generatedLandingBase, { generatedSite });

      if (artifact) {
        await workflowService.updateArtifact(artifact.id, {
          status: "approved",
          data: generatedLanding,
        });
      }
      if (landingStep) {
        await workflowService.updateStep(landingStep.id, {
          status: "completed",
          completed_at: new Date().toISOString(),
          output: generatedLanding,
        });
      }
      const projectService = new ProjectService(supabase);
      const currentConfig =
        project.config && typeof project.config === "object" && !Array.isArray(project.config)
          ? project.config
          : {};
      await projectService.updateProject(project.id, {
        config: {
          ...(currentConfig as Record<string, Json | undefined>),
          generatedSiteData: generatedSite as unknown as Json,
        },
      });
      if (reviewStep) {
        await workflowService.updateStep(reviewStep.id, {
          status: "running",
          started_at: reviewStep.started_at ?? new Date().toISOString(),
          output: buildMockArtifact("review", project.config as ProjectConfig, project.name),
        });
      }
      await workflowService.updateRun(run.id, { current_step_key: "review" });
    }

    if (body.action === "complete_review") {
      const artifact = await workflowService.getLatestArtifactByType(project.id, "review");
      const reviewStep = await workflowService.getRunStep(run.id, "review");
      const approvedReview = artifact
        ? mergeArtifactData(artifact.data, {
            approved: true,
            checklist: body.checklist,
            score: body.score,
            issues: body.issues,
          })
        : undefined;

      if (artifact && approvedReview) {
        await workflowService.updateArtifact(artifact.id, {
          status: "approved",
          data: approvedReview,
        });
      }
      if (reviewStep) {
        await workflowService.updateStep(reviewStep.id, {
          status: "completed",
          completed_at: new Date().toISOString(),
          output: approvedReview,
        });
      }
      await workflowService.updateRun(run.id, {
        status: "completed",
        current_step_key: "review",
        completed_at: new Date().toISOString(),
      });
    }

    const workflow = await loadWorkflow(workflowService, id);
    return NextResponse.json({ ok: true, workflow });
  } catch (error) {
    const message = error instanceof Error ? error.message : "워크플로우를 업데이트하지 못했습니다.";
    return NextResponse.json(
      { ok: false, error: message, code: "api_error" },
      { status: 500 }
    );
  }
}


