import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestDbAndUser } from "@/lib/supabase/request-user";
import { ProjectService } from "@/services/project.service";
import { GenerationWorkflowService } from "@/services/generation-workflow.service";
import { initializeProjectWebsitePipeline } from "@/services/project-website-pipeline.service";
import { buildGeneratedSiteData } from "@/lib/generated-site";
import { buildElementorExportDebug, mapGeneratedSiteToElementor } from "@/lib/elementor-export";
import {
  REAL_ESTATE_SPECIALTIES,
  mapSpecialtyToPropertyType,
  type ProjectConfig,
  type RealEstateSpecialty,
} from "@/config/project-options";
import type { Json } from "@/types/database.types";

export const runtime = "nodejs";

const generatorSchema = z.object({
  industry: z.enum(["real_estate", "clinic", "manufacturing", "academy", "commerce", "legal_tax"]).default("real_estate"),
  businessType: z.enum(REAL_ESTATE_SPECIALTIES),
  realEstateType: z.enum(REAL_ESTATE_SPECIALTIES).optional(),
  companyName: z.string().min(1).max(100),
  region: z.string().min(1).max(100),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  designStyle: z.enum(["premium", "minimal", "corporate", "bold"]),
  domain: z.string().max(120).optional().or(z.literal("")),
  deploymentMode: z.enum(["managed_hosting", "existing_hosting"]).default("managed_hosting"),
});

function generateSlug() {
  return `site-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function targetAudienceValue(value: RealEstateSpecialty): ProjectConfig["targetAudience"] {
  const values: Record<RealEstateSpecialty, ProjectConfig["targetAudience"]> = {
    "공장,창고,토지": "제조업체",
    "상가,오피스텔": "소규모 사업자",
    "아파트,주택": "투자자",
    "펜션·숙박": "투자자",
    "지역 종합 부동산": "대기업/법인",
  };
  return values[value];
}

function designStyleLabel(value: z.infer<typeof generatorSchema>["designStyle"]) {
  const labels = {
    premium: "프리미엄",
    minimal: "미니멀",
    corporate: "기업형",
    bold: "강한 전환형",
  };
  return labels[value];
}

export async function POST(request: Request) {
  try {
    const { db: supabase, user, isFallbackUser } = await getRequestDbAndUser();

    const body = await request.json().catch(() => null);
    const parsed = generatorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "입력값을 확인해주세요.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      industry,
      businessType,
      realEstateType = businessType,
      companyName,
      region,
      brandColor,
      designStyle,
      domain,
      deploymentMode,
    } = parsed.data;
    const projectService = new ProjectService(supabase);
    const slug = generateSlug();
    const projectConfig: ProjectConfig & Record<string, unknown> = {
      industry,
      industryTemplateId: "real_estate",
      deploymentMode,
      businessType,
      realEstateType,
      propertySpecialty: realEstateType,
      companyName,
      region,
      brandColor,
      designStyle,
      propertyType: mapSpecialtyToPropertyType(realEstateType),
      transactionType:
        realEstateType === "공장,창고,토지" || realEstateType === "펜션·숙박" ? "매매" : "임대",
      targetAudience: targetAudienceValue(realEstateType),
      purpose: `${companyName}의 ${designStyleLabel(designStyle)} 스타일 부동산 웹사이트 자동 생성`,
    };

    const project = await projectService.createProject({
      user_id: user.id,
      name: `${companyName} 웹사이트`,
      slug,
      deployment_mode: deploymentMode,
      status: "draft",
      config: projectConfig as Json,
    });

    const pipeline = await initializeProjectWebsitePipeline({
      db: supabase,
      project,
      userId: user.id,
      userEmail: user.email,
      domain: domain || undefined,
    });
    const workflowService = new GenerationWorkflowService(supabase);
    const artifacts = await workflowService.getRunArtifacts(pipeline.run.id);
    const generatedSiteData = buildGeneratedSiteData({
      artifacts,
      config: projectConfig,
      projectName: project.name,
      workflowRunId: pipeline.run.id,
    });
    const elementorTemplate = mapGeneratedSiteToElementor(generatedSiteData);
    const elementorDebug = buildElementorExportDebug(generatedSiteData);
    const seoConfig = pipeline.deployment.plan.seo;
    const updatedProject = await projectService.updateProject(project.id, {
      config: ({
        ...projectConfig,
        generatedSiteData,
        generatedAt: new Date().toISOString(),
        elementorTemplateArtifact: {
          type: "elementor_template_json",
          document: elementorTemplate,
          debug: elementorDebug,
        },
        seoConfig,
        deploymentMode,
      } as unknown) as Json,
    });

    return NextResponse.json(
      {
        project: updatedProject,
        site: pipeline.deployment.site,
        deployment: pipeline.deployment.deployment,
        steps: pipeline.deployment.steps,
        authMode: isFallbackUser ? "fallback" : "session",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[website-generator] failed", error);
    return NextResponse.json(
      {
        error: "웹사이트 생성 중 서버 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
