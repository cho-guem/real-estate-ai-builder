import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ProjectService } from "@/services/project.service";
import { WordPressDeploymentService } from "@/services/wordpress-deployment.service";
import type { WordPressDeploymentProvider } from "@/types/wordpress-deployment.types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectService = new ProjectService(supabase);
  const project = await projectService.getProjectById(id);
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const deploymentService = new WordPressDeploymentService(supabase);
  const snapshot = await deploymentService.getProjectDeploymentSnapshot(project.id);
  return NextResponse.json(snapshot);
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const deploymentService = new WordPressDeploymentService(supabase);
  const result = await deploymentService.createDeploymentRequest({
    projectId: id,
    userId: user.id,
    provider: parseProvider(body.provider),
    domain: typeof body.domain === "string" ? body.domain : undefined,
    adminEmail: typeof body.adminEmail === "string" ? body.adminEmail : user.email ?? "",
    adminUsername: typeof body.adminUsername === "string" ? body.adminUsername : undefined,
    businessType: typeof body.businessType === "string" ? body.businessType : undefined,
    companyName: typeof body.companyName === "string" ? body.companyName : undefined,
    mainColor: typeof body.mainColor === "string" ? body.mainColor : undefined,
    region: typeof body.region === "string" ? body.region : undefined,
    deploymentMode:
      body.deploymentMode === "managed_hosting" || body.deploymentMode === "existing_hosting"
        ? body.deploymentMode
        : undefined,
    deploymentConfirmed: body.deploymentConfirmed === true,
  });

  return NextResponse.json(result, { status: 201 });
}

function parseProvider(value: unknown): WordPressDeploymentProvider | undefined {
  if (value === "docker" || value === "wp_cli" || value === "managed_host" || value === "mock") {
    return value;
  }
  return undefined;
}
