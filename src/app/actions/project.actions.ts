"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
  TARGET_AUDIENCES,
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
  propertyType: z.enum(PROPERTY_TYPES, {
    errorMap: () => ({ message: "매물 유형을 선택해주세요" }),
  }),
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
    propertyType: formData.get("propertyType"),
    transactionType: formData.get("transactionType"),
    targetAudience: formData.get("targetAudience"),
    purpose: formData.get("purpose"),
  };

  const parsed = createProjectSchema.safeParse(raw);

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    const fieldErrors: ProjectActionState["fieldErrors"] = {
      name: flat.name?.[0],
      region: flat.region?.[0],
      propertyType: flat.propertyType?.[0],
      transactionType: flat.transactionType?.[0],
      targetAudience: flat.targetAudience?.[0],
      purpose: flat.purpose?.[0],
    };
    const firstError = Object.values(fieldErrors).find(Boolean);
    return { error: firstError, fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다" };

  const { name, region, propertyType, transactionType, targetAudience, purpose } =
    parsed.data;

  let projectId: string;

  try {
    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name,
        slug: generateSlug(),
        status: "draft",
        config: { region, propertyType, transactionType, targetAudience, purpose },
      })
      .select("id")
      .single();

    if (error || !project) {
      return { error: "프로젝트 생성 중 오류가 발생했어요. 다시 시도해주세요." };
    }

    projectId = project.id;
  } catch {
    return { error: "프로젝트 생성 중 오류가 발생했어요. 다시 시도해주세요." };
  }

  redirect(`/projects/${projectId}`);
}
