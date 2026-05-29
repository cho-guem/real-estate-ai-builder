import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProjectService } from "@/services/project.service";
import { WordPressDeploymentService } from "@/services/wordpress-deployment.service";
import { WebsiteGeneratorDashboard } from "@/components/dashboard/website-generator-dashboard";

export const metadata: Metadata = { title: "AI Website Generator" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const projectService = new ProjectService(supabase);
  const deploymentService = new WordPressDeploymentService(supabase);
  const projects = user ? await projectService.getUserProjects(user.id) : [];
  const recentWebsites = await Promise.all(
    projects.slice(0, 6).map(async (project) => {
      const snapshot = await deploymentService.getProjectDeploymentSnapshot(project.id);
      return {
        project,
        site: snapshot.site,
        deployment: snapshot.deployment,
        steps: snapshot.steps,
      };
    })
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <WebsiteGeneratorDashboard recentWebsites={recentWebsites} />
      </div>
    </div>
  );
}
