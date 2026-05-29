"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { initializeProjectWebsitePipeline } from "@/services/project-website-pipeline.service";
import {
  INDUSTRY_OPTIONS,
  PROPERTY_TYPES,
  REAL_ESTATE_SPECIALTIES,
  TRANSACTION_TYPES,
  TARGET_AUDIENCES,
  mapSpecialtyToPropertyType,
} from "@/config/project-options";

export type ProjectActionState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

// ─────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────

const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "프로젝트명을 입력해주세요")
    .max(100, "100자 이내로 입력해주세요"),
  region: z
    .string()
    .min(1, "지역을 입력해주세요")
    .max(100, "100자 이내로 입력해주세요"),
  industry: z
    .enum(INDUSTRY_OPTIONS.map((option) => option.value) as ["real_estate", "clinic", "manufacturing", "academy", "commerce", "legal_tax"], {
      errorMap: () => ({ message: "업종을 선택해주세요" }),
    })
    .refine((value) => value === "real_estate", {
      message: "현재는 부동산 업종만 이용할 수 있습니다",
    }),
  realEstateType: z.enum(REAL_ESTATE_SPECIALTIES, {
    errorMap: () => ({ message: "부동산 세부 유형을 선택해주세요" }),
  }),
  propertySpecialty: z.enum(REAL_ESTATE_SPECIALTIES, {
    errorMap: () => ({ message: "부동산 세부 유형을 선택해주세요" }),
  }),
  propertyType: z.enum(PROPERTY_TYPES, {
    errorMap: () => ({ message: "매물 유형을 선택해주세요" }),
  }).optional(),
  transactionType: z.enum(TRANSACTION_TYPES, {
    errorMap: () => ({ message: "거래 유형을 선택해주세요" }),
  }),
  targetAudience: z.enum(TARGET_AUDIENCES, {
    errorMap: () => ({ message: "타깃 고객을 선택해주세요" }),
  }),
  purpose: z
    .string()
    .min(1, "사이트 목적을 입력해주세요")
    .max(500, "500자 이내로 입력해주세요"),
  deploymentMode: z.enum(["managed_hosting", "existing_hosting"], {
    errorMap: () => ({ message: "사이트 설치 방식을 선택해주세요" }),
  }),
});

// ─────────────────────────────────────────────
// Slug
// ─────────────────────────────────────────────

function generateSlug(): string {
  return `project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─────────────────────────────────────────────
// Create Project
// ─────────────────────────────────────────────

export async function createProjectAction(
  _prev: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  const raw = {
    name: formData.get("name"),
    region: formData.get("region"),
    industry: formData.get("industry"),
    realEstateType: formData.get("realEstateType"),
    propertySpecialty: formData.get("propertySpecialty"),
    propertyType: formData.get("propertyType"),
    transactionType: formData.get("transactionType"),
    targetAudience: formData.get("targetAudience"),
    purpose: formData.get("purpose"),
    deploymentMode: formData.get("deploymentMode"),
  };

  const parsed = createProjectSchema.safeParse(raw);

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    const fieldErrors: ProjectActionState["fieldErrors"] = {
      name: flat.name?.[0],
      region: flat.region?.[0],
      industry: flat.industry?.[0],
      realEstateType: flat.realEstateType?.[0] ?? flat.propertySpecialty?.[0],
      propertyType: flat.propertyType?.[0],
      transactionType: flat.transactionType?.[0],
      targetAudience: flat.targetAudience?.[0],
      purpose: flat.purpose?.[0],
      deploymentMode: flat.deploymentMode?.[0],
    };
    const firstError = Object.values(fieldErrors).find(Boolean);
    return { error: firstError, fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다" };

  const {
    name,
    region,
    industry,
    realEstateType,
    propertySpecialty,
    propertyType,
    transactionType,
    targetAudience,
    purpose,
    deploymentMode,
  } =
    parsed.data;
  const compatiblePropertyType = propertyType ?? mapSpecialtyToPropertyType(realEstateType);

  let projectId: string;

  try {
    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name,
        slug: generateSlug(),
        deployment_mode: deploymentMode,
        status: "draft",
        config: {
          industry,
          industryTemplateId: "real_estate",
          deploymentMode,
          realEstateType,
          propertySpecialty,
          region,
          propertyType: compatiblePropertyType,
          transactionType,
          targetAudience,
          purpose,
        },
      })
      .select("*")
      .single();

    if (error || !project) {
      return { error: "프로젝트 생성 중 오류가 발생했어요. 다시 시도해주세요." };
    }

    projectId = project.id;

    try {
      await initializeProjectWebsitePipeline({
        db: supabase,
        project,
        userId: user.id,
        userEmail: user.email,
      });
    } catch (pipelineError) {
      console.error("[project-create] website pipeline initialization failed", pipelineError);
    }
  } catch {
    return { error: "프로젝트 생성 중 오류가 발생했어요. 다시 시도해주세요." };
  }

  redirect(`/projects/${projectId}`);
}
