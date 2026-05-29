import { SSHDeployer } from "@/lib/ssh-deployer";
import { Client } from "ssh2";
import { WordPressDeploymentRepository } from "@/repositories/wordpress-deployment.repository";
import { WordPressDeploymentStepRepository } from "@/repositories/wordpress-deployment-step.repository";
import { WordPressSiteRepository } from "@/repositories/wordpress-site.repository";
import { ProjectRepository } from "@/repositories/project.repository";
import type { ProjectConfig } from "@/config/project-options";
import type { DbClient } from "@/repositories/base/repository.base";
import type { Json, Tables } from "@/types/database.types";
import { getIndustryTemplate } from "@/config/industry-template-registry";
import {
  WORDPRESS_DEPLOYMENT_STEPS,
  type WordPressDeploymentProvider,
  type WordPressDeploymentRequest, 
  type WordPressDeploymentSnapshot,
  type WordPressProvisioningPlan,
} from "@/types/wordpress-deployment.types";

export class WordPressDeploymentService {
  private readonly projectRepo: ProjectRepository;
  private readonly siteRepo: WordPressSiteRepository;
  private readonly deploymentRepo: WordPressDeploymentRepository;
  private readonly stepRepo: WordPressDeploymentStepRepository;

  constructor(private readonly db: DbClient) {
    this.projectRepo = new ProjectRepository(db);
    this.siteRepo = new WordPressSiteRepository(db);
    this.deploymentRepo = new WordPressDeploymentRepository(db);
    this.stepRepo = new WordPressDeploymentStepRepository(db);
  }

  async getProjectDeploymentSnapshot(projectId: string): Promise<WordPressDeploymentSnapshot> {
    const site = await this.siteRepo.findByProjectId(projectId);
    const deployment = await this.deploymentRepo.findLatestByProjectId(projectId);
    const steps = deployment ? await this.stepRepo.findByDeploymentId(deployment.id) : [];
    return { site, deployment, steps };
  }

 async createDeploymentRequest(request: WordPressDeploymentRequest) {

const rawName =
  request.companyName ||
  request.businessType ||
  request.projectId;

console.log("companyName=", request.companyName);
console.log("businessType=", request.businessType);
console.log("projectId=", request.projectId);


const slug = rawName
  .toLowerCase()
  .replace(/[^a-z0-9가-힣]/g, "-")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 20);

console.log("slug=", slug);

const installDomain = `${slug}.monopoint.co.kr`;

const sitePath = `/home/${installDomain}/public_html`;

const safeDbPrefix = installDomain
  .replace(/[^a-zA-Z0-9]/g, "_")
  .slice(0, 20);

const dbName = `${safeDbPrefix}_db`;
const dbUser = `${safeDbPrefix}_user`.slice(0, 24);
const dbPass = `Wp_${Date.now()}!`;
const siteUrl = `http://${installDomain}`;

  const ssh = new SSHDeployer();

  await ssh.connect();

  await ssh.exec("mkdir -p /home/test.monopoint.co.kr/public_html");

  console.log("[SERVER] test-site 폴더 생성 완료");

  await ssh.exec(`
    cd /home/test.monopoint.co.kr/public_html &&
    wp core download --allow-root --force
  `);

  console.log("[SERVER] 워드프레스 다운로드 완료");

await ssh.exec(`
mysql -u root -e "
CREATE DATABASE IF NOT EXISTS test_site_db;
CREATE USER IF NOT EXISTS 'test_user'@'localhost' IDENTIFIED BY 'test1234!';
GRANT ALL PRIVILEGES ON test_site_db.* TO 'test_user'@'localhost';
FLUSH PRIVILEGES;
"
`);

console.log("[SERVER] MySQL DB 생성 완료");

await ssh.exec(`
cd /home/test.monopoint.co.kr/public_html &&
wp config create \
--dbname=test_site_db \
--dbuser=test_user \
--dbpass='test1234!' \
--dbhost=localhost \
--allow-root \
--force
`);

console.log("[SERVER] wp-config 생성 완료");

await ssh.exec(`
cd /home/test.monopoint.co.kr/public_html &&
wp core install \
--url="http://test.monopoint.co.kr" \
--title="Test Site" \
--admin_user="admin" \
--admin_password="admin1234!" \
--admin_email="test@example.com" \
--allow-root
`);

console.log("[SERVER] 워드프레스 설치 완료");



  ssh.disconnect();

    const project = await this.projectRepo.findById(request.projectId);
    if (!project || project.user_id !== request.userId) {
      throw new Error("Project not found");
    }

    const deploymentMode = request.deploymentMode ?? project.deployment_mode ?? "managed_hosting";
    const provider = request.provider ?? this.getDefaultProvider(deploymentMode);
    const plan = this.buildProvisioningPlan(project, request);
    const domain = request.domain ?? plan.domain;
    const site = await this.siteRepo.upsertByProject({
      project_id: project.id,
      user_id: request.userId,
      provider,
      domain: domain ?? null,
      status: "queued",
      admin_username: plan.adminUsername,
      admin_email: plan.adminEmail,
      metadata: { plan } as Json,
    });

    const deployment = await this.deploymentRepo.create({
      site_id: site.id,
      project_id: project.id,
      user_id: request.userId,
      provider,
      requested_domain: domain ?? null,
      status: "queued",
      input: {
        plan,
        deploymentConfirmed: request.deploymentConfirmed === true,
        confirmationStatus: request.deploymentConfirmed === true ? "confirmed" : "pending",
      } as Json,
      output: {
        mode: "queued",
        logs: [
          {
            at: new Date().toISOString(),
            level: "info",
            message: `Deployment queue created for ${plan.deploymentMode}.`,
            dryRun: true,
          },
          {
            at: new Date().toISOString(),
            level: "info",
            message: "Landing JSON, Elementor template artifact, and SEO config were generated from workflow artifacts.",
            dryRun: true,
          },
        ],
        artifacts: {
          landingJson: "project.config.generatedSiteData",
          elementorTemplate: "project.config.elementorTemplateArtifact",
          seoConfig: plan.seo,
        },
        note:
          "Deployment request created. A production worker should execute WP-CLI/Docker steps using this plan.",
      } as Json,
    });

    const steps = await this.stepRepo.createMany(
      WORDPRESS_DEPLOYMENT_STEPS.map((step, index) => ({
        deployment_id: deployment.id,
        project_id: project.id,
        step_key: step.key,
        label: step.label,
        order_index: index,
        status: "pending",
        metadata: {} as Json,
      }))
    );

    // In Vercel/serverless, long-running WP-CLI work should run in a queue worker.
    // We keep the request queued here so the UI and worker can coordinate safely.
    await this.markDeploymentStarted(deployment.id);

  await this.stepRepo.updateStatusByStepKey(
  deployment.id,
  "create_wordpress",
  "completed"
);

const sshResult = await this.runSSHCommand("pwd");

console.log("SSH RESULT:", sshResult);

await this.stepRepo.updateStatusByStepKey(
  deployment.id,
  "create_admin",
  "completed"
);
 
const serverTest = await this.runSSHCommand("pwd");

console.log("SERVER TEST:", serverTest);

    return { site, deployment, steps, plan };
  }

  async markDeploymentStarted(deploymentId: string) {
    return this.deploymentRepo.update(deploymentId, {
      status: "validating",
      started_at: new Date().toISOString(),
    });
  }

  private async runSSHCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    let output = "";

    conn
      .on("ready", () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            conn.end();
            reject(err);
            return;
          }

          stream
            .on("close", () => {
              conn.end();
              resolve(output);
            })
            .on("data", (data: Buffer) => {
              output += data.toString();
            });

          stream.stderr.on("data", (data: Buffer) => {
            output += data.toString();
          });
        });
      })
      .on("error", (err) => {
        reject(err);
      })
      .connect({
        host: process.env.DEPLOYMENT_SERVER_HOST!,
        port: Number(process.env.DEPLOYMENT_SERVER_PORT || 22),
        username: process.env.DEPLOYMENT_SERVER_USER!,
        password: process.env.DEPLOYMENT_SERVER_PASSWORD!,
      });
  });
}

  buildProvisioningPlan(
    project: Tables<"projects">,
    request: WordPressDeploymentRequest
  ): WordPressProvisioningPlan {
    const config = project.config && typeof project.config === "object" && !Array.isArray(project.config)
      ? (project.config as Record<string, unknown>)
      : {};
    const template = getIndustryTemplate(stringValue(config.industry, "real_estate"));
    const projectConfig = config as unknown as ProjectConfig;
    const deploymentMode = request.deploymentMode ?? project.deployment_mode ?? "managed_hosting";
    const defaultDomain =
      deploymentMode === "managed_hosting"
        ? `${project.slug}.${process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "ourdomain.com"}`
        : undefined;

    return {
      siteName: project.name,
      domain: request.domain || defaultDomain,
      adminEmail: request.adminEmail,
      adminUsername: request.adminUsername || "site-admin",
      deploymentMode,
      pluginZipPath: template.deployment.pluginZipPath,
      elementorTemplatePath: template.deployment.elementorTemplatePath,
      seo: template.buildInitialSeo(projectConfig, project.name),
      siteStructure: template.buildSiteStructure(projectConfig),
      setup: {
        businessType: request.businessType || String(config.propertyType ?? "factory"),
        companyName: request.companyName || project.name,
        mainColor: request.mainColor || "#1f7a4d",
        region: request.region || String(config.region ?? "창원·김해·부산"),
      },
    };
  }

  private getDefaultProvider(deploymentMode: "managed_hosting" | "existing_hosting"): WordPressDeploymentProvider {
    const provider = process.env.WORDPRESS_DEPLOYMENT_PROVIDER;
    if (provider === "docker" || provider === "wp_cli" || provider === "managed_host") {
      return provider;
    }
    return deploymentMode === "managed_hosting" ? "managed_host" : "wp_cli";
  }
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}
