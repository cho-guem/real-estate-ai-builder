import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestDbAndUser } from "@/lib/supabase/request-user";
import { ProjectService } from "@/services/project.service";
import {
  INDUSTRY_OPTIONS,
  PROPERTY_TYPES,
  REAL_ESTATE_SPECIALTIES,
  TARGET_AUDIENCES,
  TRANSACTION_TYPES,
  mapSpecialtyToPropertyType,
} from "@/config/project-options";
import type { Json } from "@/types/database.types";

export const runtime = "nodejs";

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  region: z.string().min(1).max(100),
  industry: z
    .enum(
      INDUSTRY_OPTIONS.map((option) => option.value) as [
        "real_estate",
        "clinic",
        "manufacturing",
        "academy",
        "commerce",
        "legal_tax",
      ]
    )
    .refine((value) => value === "real_estate"),
  realEstateType: z.enum(REAL_ESTATE_SPECIALTIES),
  propertySpecialty: z.enum(REAL_ESTATE_SPECIALTIES).optional(),
  propertyType: z.enum(PROPERTY_TYPES).optional(),
  transactionType: z.enum(TRANSACTION_TYPES),
  targetAudience: z.enum(TARGET_AUDIENCES),
  purpose: z.string().min(1).max(500),
  deploymentMode: z.enum(["managed_hosting", "existing_hosting"]).default("managed_hosting"),
});

function generateSlug() {
  return `project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function POST(request: Request) {
  try {
    const { db, user, isFallbackUser } = await getRequestDbAndUser();
    const body = await request.json().catch(() => null);
    const parsed = createProjectSchema.safeParse(body);

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
    } = parsed.data;

    const projectService = new ProjectService(db);
    const project = await projectService.createProject({
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
        propertySpecialty: propertySpecialty ?? realEstateType,
        region,
        propertyType: propertyType ?? mapSpecialtyToPropertyType(realEstateType),
        transactionType,
        targetAudience,
        purpose,
      } as Json,
    });

    return NextResponse.json(
      {
        project,
        authMode: isFallbackUser ? "fallback" : "session",
        nextStep: `/projects/${project.id}?startWorkflow=1`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[projects] create failed", error);
    return NextResponse.json(
      {
        error: "프로젝트 생성 중 서버 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
