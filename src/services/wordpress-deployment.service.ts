import { WordPressDeploymentRepository } from "@/repositories/wordpress-deployment.repository";
import { WordPressDeploymentStepRepository } from "@/repositories/wordpress-deployment-step.repository";
import { WordPressSiteRepository } from "@/repositories/wordpress-site.repository";
import { ProjectRepository } from "@/repositories/project.repository";
import { SSHDeployer } from "@/lib/ssh-deployer";
import { existsSync } from "node:fs";
import path from "node:path";
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

    if (shouldProvisionImmediately(provider, deploymentMode)) {
      try {
        await this.provisionManagedWordPress({
          deploymentId: deployment.id,
          siteId: site.id,
          plan,
          project,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "WordPress provisioning failed";
        await this.deploymentRepo.update(deployment.id, {
          status: "failed",
          failed_at: new Date().toISOString(),
          error_message: message,
        });
        await this.siteRepo.update(site.id, {
          status: "failed",
        });
        await this.stepRepo.updateStatusByStepKey(
          deployment.id,
          "create_wordpress",
          "failed",
          message
        );
        throw error;
      }

      const snapshot = await this.getProjectDeploymentSnapshot(project.id);
      return {
        site: snapshot.site,
        deployment: snapshot.deployment,
        steps: snapshot.steps,
        plan,
      };
    }

    return { site, deployment, steps, plan };
  }

  async markDeploymentStarted(deploymentId: string) {
    return this.deploymentRepo.update(deploymentId, {
      status: "validating",
      started_at: new Date().toISOString(),
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
        ? `${project.slug}.${process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "monopoint.co.kr"}`
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

  private async provisionManagedWordPress({
    deploymentId,
    siteId,
    plan,
    project,
  }: {
    deploymentId: string;
    siteId: string;
    plan: WordPressProvisioningPlan;
    project: Tables<"projects">;
  }) {
    const domain = normalizeDomain(plan.domain || `${project.slug}.monopoint.co.kr`);
    const sitePath = `/home/${domain}/public_html`;
    const dbId = project.id.replace(/-/g, "").slice(0, 12);
    const dbName = `wp_${dbId}`;
    const dbUser = `wp_${dbId}`.slice(0, 16);
    const dbPass = `Wp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}!`;
    const adminPassword = `WpAdmin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}!`;
    const siteUrl = `http://${domain}`;
    let publicSiteUrl = siteUrl;
    let sslStatus: "completed" | "pending" = "pending";
    let sslMessage =
      "LiteSpeed vhost is configured. DNS wildcard must resolve before SSL can be issued.";
    const webUser = process.env.WORDPRESS_WEB_USER || "testm2663";
    const webGroup = process.env.WORDPRESS_WEB_GROUP || webUser;
    const ssh = new SSHDeployer();

    await this.deploymentRepo.update(deploymentId, {
      status: "provisioning_wordpress",
      started_at: new Date().toISOString(),
    });
    await this.siteRepo.update(siteId, {
      domain,
      status: "provisioning_wordpress",
    });
    await this.stepRepo.updateStatusByStepKey(deploymentId, "create_wordpress", "running");

    try {
      await ssh.connect();
      await ssh.exec(buildPrepareVhostCommand({ domain, webUser, webGroup }));
      await ssh.exec(`cd ${shQuote(sitePath)} && wp core download --allow-root --force`);
      await ssh.exec(buildDatabaseCommand({ dbName, dbUser, dbPass }));
      await ssh.exec(
        [
          `cd ${shQuote(sitePath)} && wp config create`,
          `--dbname=${shQuote(dbName)}`,
          `--dbuser=${shQuote(dbUser)}`,
          `--dbpass=${shQuote(dbPass)}`,
          "--dbhost=localhost",
          "--allow-root",
          "--force",
        ].join(" ")
      );

      await this.stepRepo.updateStatusByStepKey(deploymentId, "create_wordpress", "completed");
      await this.stepRepo.updateStatusByStepKey(deploymentId, "create_admin", "running");

      await ssh.exec(
        [
          `cd ${shQuote(sitePath)} && wp core install`,
          `--url=${shQuote(siteUrl)}`,
          `--title=${shQuote(plan.siteName)}`,
          `--admin_user=${shQuote(plan.adminUsername)}`,
          `--admin_password=${shQuote(adminPassword)}`,
          `--admin_email=${shQuote(plan.adminEmail || "admin@example.com")}`,
          "--allow-root",
        ].join(" ")
      );
      await ssh.exec(`chown -R ${shQuote(webUser)}:${shQuote(webGroup)} ${shQuote(`/home/${domain}`)}`);

      await this.stepRepo.updateStatusByStepKey(deploymentId, "create_admin", "completed");
      await this.stepRepo.updateStatusByStepKey(deploymentId, "upload_plugin_zip", "running");
      const pluginZipPath = resolveAssetPath(
        process.env.WORDPRESS_PLUGIN_PACKAGE_PATH ||
          plan.pluginZipPath ||
          "ai-real-estate-property-manager.zip"
      );
      if (!pluginZipPath) {
        throw new Error("WordPress plugin ZIP file was not found on the deployment server.");
      }
      await this.stepRepo.updateStatusByStepKey(deploymentId, "upload_plugin_zip", "completed");

      await this.stepRepo.updateStatusByStepKey(deploymentId, "install_plugin", "running");
      await ssh.exec(
        `cd ${shQuote(sitePath)} && wp plugin install ${shQuote(pluginZipPath)} --force --activate --allow-root`
      );
      await this.stepRepo.updateStatusByStepKey(deploymentId, "install_plugin", "completed");
      await this.stepRepo.updateStatusByStepKey(deploymentId, "activate_plugin", "completed");

      await this.stepRepo.updateStatusByStepKey(deploymentId, "run_setup_wizard", "running");
      await ssh.exec(
        `cd ${shQuote(sitePath)} && wp eval ${shQuote(buildPluginSetupPhp(plan))} --allow-root`
      );
      await this.stepRepo.updateStatusByStepKey(deploymentId, "run_setup_wizard", "completed");

      await this.stepRepo.updateStatusByStepKey(deploymentId, "import_elementor", "running");
      await ssh.exec(`cd ${shQuote(sitePath)} && wp plugin install elementor --activate --allow-root`);
      const elementorTemplatePath = resolveAssetPath(
        process.env.WORDPRESS_ELEMENTOR_TEMPLATE_PATH ||
          plan.elementorTemplatePath ||
          "elementor-template.json",
        "elementor"
      );
      if (!elementorTemplatePath) {
        throw new Error("Elementor template JSON file was not found on the deployment server.");
      }
      await ssh.exec(
        `cd ${shQuote(sitePath)} && wp eval ${shQuote(buildElementorImportPhp(elementorTemplatePath))} --allow-root`
      );
      await this.stepRepo.updateStatusByStepKey(deploymentId, "import_elementor", "completed");
      await this.stepRepo.updateStatusByStepKey(deploymentId, "connect_domain", "running");
      try {
        await ssh.exec(buildIssueSslCommand({ domain }));
        publicSiteUrl = `https://${domain}`;
        sslStatus = "completed";
        sslMessage = "Public DNS and SSL certificate are configured.";
        await ssh.exec(
          `cd ${shQuote(sitePath)} && wp option update home ${shQuote(publicSiteUrl)} --allow-root && wp option update siteurl ${shQuote(publicSiteUrl)} --allow-root`
        );
        await this.stepRepo.updateStatusByStepKey(
          deploymentId,
          "connect_domain",
          "completed"
        );
      } catch (error) {
        sslMessage = error instanceof Error ? error.message : sslMessage;
        await this.stepRepo.updateStatusByStepKey(
          deploymentId,
          "connect_domain",
          "skipped",
          sslMessage
        );
      }

      await this.deploymentRepo.update(deploymentId, {
        status: "completed",
        completed_at: new Date().toISOString(),
        output: {
          mode: "real",
          wordpressUrl: publicSiteUrl,
          domain,
          sitePath,
          pluginZipPath,
          elementorTemplatePath,
          sslStatus,
          sslMessage,
          completedSteps: [
            "create_wordpress",
            "create_admin",
            "upload_plugin_zip",
            "install_plugin",
            "activate_plugin",
            "run_setup_wizard",
            "import_elementor",
            ...(sslStatus === "completed" ? ["connect_domain"] : []),
          ],
          nextSteps: sslStatus === "completed" ? [] : ["connect_domain_dns_or_retry_ssl"],
          note: sslMessage,
        } as Json,
      });
      await this.siteRepo.update(siteId, {
        domain,
        site_url: publicSiteUrl,
        admin_url: `${publicSiteUrl.replace(/\/$/, "")}/wp-admin/`,
        wp_install_path: sitePath,
        status: "completed",
        wp_version: null,
        metadata: {
          plan,
          wordpressUrl: publicSiteUrl,
          sitePath,
          pluginZipPath,
          elementorTemplatePath,
          sslStatus,
          sslMessage,
        } as Json,
      });
    } finally {
      ssh.disconnect();
    }
  }
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function shouldProvisionImmediately(
  provider: WordPressDeploymentProvider,
  deploymentMode: "managed_hosting" | "existing_hosting"
) {
  if (process.env.WORDPRESS_AUTO_PROVISION === "false") return false;
  return deploymentMode === "managed_hosting" && provider === "managed_host";
}

function normalizeDomain(domain: string) {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

function shQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function buildDatabaseCommand({
  dbName,
  dbUser,
  dbPass,
}: {
  dbName: string;
  dbUser: string;
  dbPass: string;
}) {
  return `mysql -u root <<'SQL'
CREATE DATABASE IF NOT EXISTS \`${dbName}\`;
CREATE USER IF NOT EXISTS '${sqlString(dbUser)}'@'localhost' IDENTIFIED BY '${sqlString(dbPass)}';
GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${sqlString(dbUser)}'@'localhost';
FLUSH PRIVILEGES;
SQL`;
}

function buildPrepareVhostCommand({
  domain,
  webUser,
  webGroup,
}: {
  domain: string;
  webUser: string;
  webGroup: string;
}) {
  const quotedDomain = shQuote(domain);
  const quotedWebUser = shQuote(webUser);
  const quotedWebGroup = shQuote(webGroup);

  return `set -e
export DOMAIN=${quotedDomain}
export WEB_USER=${quotedWebUser}
export WEB_GROUP=${quotedWebGroup}
SITE_ROOT="/home/$DOMAIN"
PUBLIC_HTML="$SITE_ROOT/public_html"
VHOST_DIR="/usr/local/lsws/conf/vhosts/$DOMAIN"
HTTPD_CONF="/usr/local/lsws/conf/httpd_config.conf"
mkdir -p "$PUBLIC_HTML" "$SITE_ROOT/logs" "$VHOST_DIR"
if [ -f /usr/local/lsws/conf/vhosts/test.monopoint.co.kr/vhost.conf ] && [ ! -f "$VHOST_DIR/vhost.conf" ]; then
  cp /usr/local/lsws/conf/vhosts/test.monopoint.co.kr/vhost.conf "$VHOST_DIR/vhost.conf"
fi
python3 <<'PY'
import os
import re
from pathlib import Path

domain = os.environ["DOMAIN"]
conf_path = Path("/usr/local/lsws/conf/httpd_config.conf")
conf = conf_path.read_text()
map_line = f"  map                     {domain} {domain}"

for listener in ("Default", "SSL", "SSL IPv6"):
    marker = f"listener {listener}{{"
    if marker in conf and map_line not in conf:
        conf = conf.replace(marker, marker + "\\n" + map_line, 1)

conf = re.sub(
    rf"\\nvirtualHost\\s+{re.escape(domain)}\\s+\\{{.*?\\n\\}}",
    "",
    conf,
    flags=re.S,
)
conf = conf.rstrip() + f"""

virtualHost {domain} {{
  vhRoot                  /home/$VH_NAME
  configFile              $SERVER_ROOT/conf/vhosts/$VH_NAME/vhost.conf
  allowSymbolLink         1
  enableScript            1
  restrained              1
}}
"""
conf_path.write_text(conf)
PY
if id "$WEB_USER" >/dev/null 2>&1; then
  chown -R "$WEB_USER:$WEB_GROUP" "$SITE_ROOT"
fi
chmod 755 "$SITE_ROOT" "$PUBLIC_HTML"
systemctl restart lsws 2>/dev/null || /usr/local/lsws/bin/lswsctrl restart`;
}

function buildIssueSslCommand({ domain }: { domain: string }) {
  const quotedDomain = shQuote(domain);

  return `set -e
export DOMAIN=${quotedDomain}
ACME_WEBROOT="/usr/local/lsws/Example/html"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
VHOST_CONF="/usr/local/lsws/conf/vhosts/$DOMAIN/vhost.conf"
mkdir -p "$ACME_WEBROOT/.well-known/acme-challenge" "$CERT_DIR"
chown -R nobody:nogroup "$ACME_WEBROOT/.well-known" 2>/dev/null || true
/root/.acme.sh/acme.sh --issue -d "$DOMAIN" -w "$ACME_WEBROOT" --server letsencrypt --keylength ec-256 --force
/root/.acme.sh/acme.sh --install-cert -d "$DOMAIN" --ecc \\
  --key-file "$CERT_DIR/privkey.pem" \\
  --fullchain-file "$CERT_DIR/fullchain.pem"
python3 <<'PY'
import os
import re
from pathlib import Path

domain = os.environ["DOMAIN"]
conf_path = Path(f"/usr/local/lsws/conf/vhosts/{domain}/vhost.conf")
conf = conf_path.read_text()
key = f"/etc/letsencrypt/live/{domain}/privkey.pem"
cert = f"/etc/letsencrypt/live/{domain}/fullchain.pem"
conf = re.sub(r"keyFile\\s+\\S+", f"keyFile                 {key}", conf)
conf = re.sub(r"certFile\\s+\\S+", f"certFile                {cert}", conf)
conf_path.write_text(conf)
PY
/usr/local/lsws/bin/lswsctrl restart`;
}

function sqlString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "''");
}

function resolveAssetPath(assetPath: string, kind: "plugin" | "elementor" = "plugin") {
  const fallbackName =
    kind === "elementor" ? "elementor-template.json" : "ai-real-estate-property-manager.zip";
  const candidates = path.isAbsolute(assetPath)
    ? [assetPath]
    : [
        path.join(process.cwd(), assetPath),
        path.join(process.cwd(), "deploy-assets", assetPath),
        path.join(process.cwd(), "deploy-assets", fallbackName),
        path.join(process.cwd(), "fixed-package", "wordpress-site-package", assetPath),
        path.join(process.cwd(), "fixed-package", "wordpress-site-package", path.basename(assetPath)),
        path.join(process.cwd(), "fixed-package", "wordpress-site-package", fallbackName),
        path.join(process.cwd(), "wordpress-site-package", assetPath),
        path.join(process.cwd(), "wordpress-site-package", path.basename(assetPath)),
        path.join(process.cwd(), "wordpress-site-package", fallbackName),
      ];

  return candidates.find((candidate) => existsSync(candidate));
}

function buildPluginSetupPhp(plan: WordPressProvisioningPlan) {
  return [
    "$settings = array(",
    phpArrayItem("business_type", mapBusinessTypeForPlugin(plan.setup.businessType)),
    phpArrayItem("company_name", plan.setup.companyName),
    phpArrayItem("main_color", plan.setup.mainColor),
    phpArrayItem("region", plan.setup.region),
    ");",
    "update_option('airepm_setup_settings', $settings);",
    "AI_Real_Estate_Property_Manager::instance()->run_initial_setup($settings);",
    "flush_rewrite_rules();",
  ].join("\n");
}

function mapBusinessTypeForPlugin(value: string) {
  if (value.includes("상가") || value.includes("오피스텔") || value.includes("commercial")) {
    return "commercial";
  }
  if (value.includes("토지") || value.includes("land")) {
    return "land";
  }
  if (value.includes("종합") || value.includes("local")) {
    return "local";
  }
  return "factory";
}

function phpArrayItem(key: string, value: string) {
  return `${phpString(key)} => ${phpString(value)},`;
}

function phpString(value: string) {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

function buildElementorImportPhp(templatePath: string) {
  return [
    `$template_path = ${phpString(templatePath)};`,
    "$template = json_decode(file_get_contents($template_path), true);",
    "if (!is_array($template)) { throw new Exception('Invalid Elementor template JSON.'); }",
    "$content = isset($template['content']) && is_array($template['content']) ? $template['content'] : $template;",
    "$page_id = (int) get_option('page_on_front');",
    "if (!$page_id) { $page_id = (int) get_option('airepm_homepage_id'); }",
    "if (!$page_id) { throw new Exception('Homepage was not found for Elementor import.'); }",
    "update_post_meta($page_id, '_elementor_edit_mode', 'builder');",
    "update_post_meta($page_id, '_elementor_template_type', 'wp-page');",
    "update_post_meta($page_id, '_elementor_version', defined('ELEMENTOR_VERSION') ? ELEMENTOR_VERSION : '3.0.0');",
    "update_post_meta($page_id, '_elementor_data', wp_slash(wp_json_encode($content)));",
    "update_post_meta($page_id, '_elementor_page_settings', array());",
    "wp_update_post(array('ID' => $page_id, 'post_content' => ''));",
    "if (class_exists('Elementor\\Plugin')) { \\Elementor\\Plugin::$instance->files_manager->clear_cache(); }",
  ].join("\n");
}
