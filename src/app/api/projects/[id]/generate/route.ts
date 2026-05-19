import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAnthropicConfigured } from "@/lib/anthropic";
import { generateWebsitePlan } from "@/services/ai-generation.service";
import { ProjectService } from "@/services/project.service";
import type { ProjectConfig } from "@/config/project-options";
import type { GenerateApiResult } from "@/types/generation.types";
import type { Json } from "@/types/database.types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  _request: Request,
  { params }: RouteParams
): Promise<NextResponse<GenerateApiResult>> {
  const { id } = await params;

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "로그인이 필요합니다", code: "auth_error" },
      { status: 401 }
    );
  }

  // API key check
  if (!isAnthropicConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.local을 확인하세요.",
        code: "missing_key",
      },
      { status: 503 }
    );
  }

  // Load project and verify ownership
  const service = new ProjectService(supabase);
  const project = await service.getProjectById(id);

  if (!project || project.user_id !== user.id) {
    return NextResponse.json(
      { ok: false, error: "프로젝트를 찾을 수 없습니다", code: "auth_error" },
      { status: 404 }
    );
  }

  const cfg = (project.config ?? {}) as ProjectConfig;

  // Generate with Claude
  let content;
  try {
    content = await generateWebsitePlan(cfg);
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    const code = message.includes("파싱") ? "parse_error" : "api_error";
    return NextResponse.json({ ok: false, error: message, code }, { status: 502 });
  }

  // Persist result into config JSONB
  await service.updateProject(id, {
    config: {
      ...(typeof project.config === "object" && project.config !== null
        ? (project.config as Record<string, Json>)
        : {}),
      generatedContent: content as unknown as Json,
      generatedAt: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, content });
}
