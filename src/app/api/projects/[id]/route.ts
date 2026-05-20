import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ProjectService } from "@/services/project.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  const projectService = new ProjectService(supabase);
  const project = await projectService.getProjectById(id);

  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ ok: false, error: "삭제할 수 없는 프로젝트입니다." }, { status: 404 });
  }

  const { error: artifactError } = await supabase
    .from("website_artifacts")
    .delete()
    .eq("project_id", project.id);

  if (artifactError) {
    return NextResponse.json({ ok: false, error: artifactError.message }, { status: 500 });
  }

  const { error: stepError } = await supabase
    .from("generation_steps")
    .delete()
    .eq("project_id", project.id);

  if (stepError) {
    return NextResponse.json({ ok: false, error: stepError.message }, { status: 500 });
  }

  const { error: runError } = await supabase
    .from("generation_runs")
    .delete()
    .eq("project_id", project.id)
    .eq("user_id", user.id);

  if (runError) {
    return NextResponse.json({ ok: false, error: runError.message }, { status: 500 });
  }

  await projectService.deleteProject(project.id);

  return NextResponse.json({ ok: true });
}
