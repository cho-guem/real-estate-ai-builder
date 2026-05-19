import { NextResponse } from "next/server";
import { WORKFLOW_STEPS } from "@/config/workflow-steps";
import { defaultIndustryPreset } from "@/presets";
import type { ProjectConfig } from "@/config/project-options";
import { createClient } from "@/lib/supabase/server";
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
async function loadWorkflow(
  service: GenerationWorkflowService,
  projectId: string
): Promise<WorkflowSnapshot> {
  const run = await service.getLatestProjectRun(projectId);
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, project: null };

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
  const run = await workflowService.getLatestProjectRun(project.id);

  if (!run) {
    return NextResponse.json(
      { ok: false, error: "진행 중인 워크플로우가 없습니다.", code: "not_found" },
      { status: 404 }
    );
  }

  try {
    if (body.action === "select_benchmarks") {
      const artifact = await workflowService.getLatestArtifactByType(project.id, "benchmark");
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
        await workflowService.updateArtifact(artifact.id, {
          status: "approved",
          data: mergeArtifactData(artifact.data, {
            selectedCandidateIds: body.selectedCandidateIds,
            selectedCandidates,
            approved: true,
          }),
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
      const artifact = await workflowService.getLatestArtifactByType(project.id, "design");
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


