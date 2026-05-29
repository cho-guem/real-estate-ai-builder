import { INDUSTRY_TEMPLATE_WORKFLOW_STEPS, getIndustryTemplate } from "@/config/industry-template-registry";
import type { ProjectConfig } from "@/config/project-options";
import { GenerationWorkflowService } from "@/services/generation-workflow.service";
import { WordPressDeploymentService } from "@/services/wordpress-deployment.service";
import type { DbClient } from "@/repositories/base/repository.base";
import type { Json, Tables } from "@/types/database.types";

type PipelineInput = {
  db: DbClient;
  project: Tables<"projects">;
  userId: string;
  userEmail?: string | null;
  domain?: string;
};

function toJson(data: unknown): Json {
  return data as Json;
}

export async function initializeProjectWebsitePipeline({
  db,
  project,
  userId,
  userEmail,
  domain,
}: PipelineInput) {
  const config = (project.config ?? {}) as ProjectConfig & { industry?: string };
  const template = getIndustryTemplate(config.industry);
  const workflowService = new GenerationWorkflowService(db);
  const deploymentService = new WordPressDeploymentService(db);

  const run = await workflowService.createRun({
    project_id: project.id,
    user_id: userId,
    status: "running",
    current_step_key: "benchmark",
    started_at: new Date().toISOString(),
    metadata: {
      mode: "mock",
      industry: template.industry,
      industryTemplateId: template.id,
      siteStructure: template.buildSiteStructure(config),
      seo: template.buildInitialSeo(config, project.name),
      note: "프로젝트 생성과 동시에 부동산 사이트 구조 및 WordPress 배포 계획을 준비했습니다.",
    },
  });

  for (const [index, stepDef] of INDUSTRY_TEMPLATE_WORKFLOW_STEPS.entries()) {
    const artifactData = template.buildArtifact(stepDef.artifactType, config, project.name);
    const isFirstStep = index === 0;
    const step = await workflowService.createStep({
      run_id: run.id,
      project_id: project.id,
      step_key: stepDef.key,
      agent_role: stepDef.agentName,
      status: isFirstStep ? "running" : "pending",
      order_index: index,
      input: toJson({
        projectConfig: config,
        industryTemplateId: template.id,
      }),
      output: isFirstStep ? artifactData : null,
      model: "목업",
      input_tokens: 0,
      output_tokens: 0,
      started_at: isFirstStep ? new Date().toISOString() : null,
    });

    await workflowService.createArtifact({
      project_id: project.id,
      run_id: run.id,
      step_id: step.id,
      artifact_type: stepDef.artifactType,
      status: "draft",
      version: 1,
      data: artifactData,
    });
  }

  const deployment = await deploymentService.createDeploymentRequest({
    projectId: project.id,
    userId,
    domain,
    adminEmail: userEmail ?? "admin@example.com",
    adminUsername: "site-admin",
    businessType: config.propertyType,
    companyName: project.name,
    mainColor: "#1f7a4d",
    region: config.region,
    deploymentMode: project.deployment_mode,
    deploymentConfirmed: false,
  });

  return { run, deployment };
}
