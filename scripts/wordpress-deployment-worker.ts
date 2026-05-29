import { execFile } from "node:child_process";
import { access, copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";
import type { Database, Json, Tables } from "../src/types/database.types";
import {
  WORDPRESS_DEPLOYMENT_STEPS,
  type WordPressDeploymentStepKey,
} from "../src/types/wordpress-deployment.types";

const execFileAsync = promisify(execFile);

type Deployment = Tables<"wordpress_deployments">;
type DeploymentStep = Tables<"wordpress_deployment_steps">;
type DeploymentStatus = Database["public"]["Enums"]["wordpress_deployment_status"];
type StepStatus = Database["public"]["Enums"]["wordpress_deployment_step_status"];

type WorkerConfig = {
  supabaseUrl: string;
  serviceRoleKey: string;
  provider: string;
  dryRun: boolean;
  realDeployment: boolean;
  requireJobConfirmation: boolean;
  wpCliBin: string;
  wordpressPath: string;
  pluginZipPath: string;
  elementorTemplatePath: string;
  uploadedPluginZipPath: string;
  maxJobs: number;
};

type WorkerLog = {
  at: string;
  level: "info" | "warn" | "error";
  message: string;
  command?: string;
  dryRun?: boolean;
  stdout?: string;
  stderr?: string;
};

type CommandResult = {
  command: string;
  stdout: string;
  stderr: string;
  dryRun: boolean;
};

type PreflightCheck = {
  key: string;
  label: string;
  passed: boolean;
  message: string;
  command?: string;
  stdout?: string;
  stderr?: string;
};

type PreflightResult = {
  passed: boolean;
  checks: PreflightCheck[];
};

const STEP_TO_DEPLOYMENT_STATUS: Partial<Record<WordPressDeploymentStepKey, DeploymentStatus>> = {
  create_wordpress: "deploying",
  create_admin: "deploying",
  upload_plugin_zip: "deploying",
  install_plugin: "deploying",
  activate_plugin: "deploying",
  run_setup_wizard: "configuring",
  import_elementor: "importing",
  connect_domain: "configuring",
};

const config = loadConfig();
const supabase = createClient<Database>(config.supabaseUrl, config.serviceRoleKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log(`[wordpress-worker] starting provider=${config.provider} dryRun=${config.dryRun}`);
  const preflight = await runPreflightChecks();
  const jobs = await fetchQueuedJobs(config.maxJobs);

  if (jobs.length === 0) {
    console.log("[wordpress-worker] no queued deployments");
    return;
  }

  if (!config.dryRun && !preflight.passed) {
    console.error("[wordpress-worker] preflight failed; refusing real deployment");
    for (const job of jobs) {
      await failDeploymentForPreflight(job, preflight);
    }
    return;
  }

  for (const job of jobs) {
    await processDeployment(job, preflight);
  }
}

function loadConfig(): WorkerConfig {
  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const provider = process.env.WORDPRESS_DEPLOYMENT_PROVIDER || "mock";
  const wordpressPath = process.env.WORDPRESS_TARGET_PATH || "";
  const wpCliBin = process.env.WORDPRESS_WPCLI_BIN || "wp";
  const pluginZipPath = process.env.WORDPRESS_PLUGIN_PACKAGE_PATH || "ai-real-estate-property-manager-wizard.zip";
  const elementorTemplatePath = process.env.WORDPRESS_ELEMENTOR_TEMPLATE_PATH || "elementor-template.json";
  const maxJobs = Number.parseInt(process.env.WORDPRESS_WORKER_MAX_JOBS || "3", 10);
  const realDeployment =
    process.env.REAL_DEPLOYMENT === "true" ||
    process.env.WORDPRESS_DEPLOYMENT_MODE === "real";
  const requireJobConfirmation = process.env.WORDPRESS_REQUIRE_DEPLOYMENT_CONFIRMATION !== "false";
  const hasHostingCredentials = Boolean(wordpressPath && process.env.WORDPRESS_ADMIN_PASSWORD);
  const explicitDryRun = process.env.WORDPRESS_WORKER_DRY_RUN;
  const dryRun =
    explicitDryRun === "true" ||
    !realDeployment ||
    provider === "mock" ||
    !hasHostingCredentials;
  const uploadedPluginZipPath = wordpressPath
    ? path.join(wordpressPath, "wp-content", "uploads", "ai-real-estate-builder", path.basename(pluginZipPath))
    : pluginZipPath;

  return {
    supabaseUrl,
    serviceRoleKey,
    provider,
    dryRun,
    realDeployment,
    requireJobConfirmation,
    wpCliBin,
    wordpressPath,
    pluginZipPath,
    elementorTemplatePath,
    uploadedPluginZipPath,
    maxJobs: Number.isFinite(maxJobs) && maxJobs > 0 ? maxJobs : 3,
  };
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function runPreflightChecks(): Promise<PreflightResult> {
  const checks: PreflightCheck[] = [];

  checks.push(await checkSupabaseConnection());
  checks.push(await checkPathExists("wordpress_target_path", "WORDPRESS_TARGET_PATH exists", config.wordpressPath));
  checks.push(
    await checkPathExists(
      "wp_config",
      "wp-config.php exists",
      config.wordpressPath ? path.join(config.wordpressPath, "wp-config.php") : ""
    )
  );
  checks.push(await checkWpCliAvailable());
  checks.push(await checkWpPluginList());
  checks.push(await checkPathExists("plugin_zip", "Plugin ZIP exists", config.pluginZipPath));
  checks.push(
    await checkPathExists(
      "elementor_template",
      "Elementor template file exists",
      config.elementorTemplatePath
    )
  );

  const passed = checks.every((check) => check.passed);
  for (const check of checks) {
    const icon = check.passed ? "PASS" : "FAIL";
    console.log(`[wordpress-worker:preflight] ${icon} ${check.label}: ${check.message}`);
  }

  return { passed, checks };
}

async function checkSupabaseConnection(): Promise<PreflightCheck> {
  try {
    const { error } = await supabase.from("wordpress_deployments").select("id").limit(1);
    if (error) throw error;
    return {
      key: "supabase",
      label: "Supabase connection",
      passed: true,
      message: "Connected to Supabase and deployment table is readable.",
    };
  } catch (error) {
    return failedCheck("supabase", "Supabase connection", error);
  }
}

async function checkPathExists(key: string, label: string, targetPath: string): Promise<PreflightCheck> {
  if (!targetPath) {
    return {
      key,
      label,
      passed: false,
      message: "Path is not configured.",
    };
  }

  try {
    await access(targetPath);
    return {
      key,
      label,
      passed: true,
      message: targetPath,
    };
  } catch (error) {
    return failedCheck(key, label, error, targetPath);
  }
}

async function checkWpCliAvailable(): Promise<PreflightCheck> {
  if (config.dryRun) {
    return {
      key: "wp_cli",
      label: "WP-CLI available",
      passed: true,
      message: `Dry-run mode: would execute ${config.wpCliBin} --info.`,
      command: `${config.wpCliBin} --info`,
    };
  }

  try {
    const result = await execPreflightCommand(config.wpCliBin, ["--info"]);
    return {
      key: "wp_cli",
      label: "WP-CLI available",
      passed: true,
      message: "WP-CLI responded successfully.",
      command: result.command,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error) {
    return failedCheck("wp_cli", "WP-CLI available", error, `${config.wpCliBin} --info`);
  }
}

async function checkWpPluginList(): Promise<PreflightCheck> {
  const args = ["plugin", "list", "--format=json", ...wpPathArgs()];
  if (config.dryRun) {
    return {
      key: "wp_plugin_list",
      label: "wp plugin list dry check",
      passed: true,
      message: `Dry-run mode: would execute ${config.wpCliBin} ${args.join(" ")}.`,
      command: `${config.wpCliBin} ${args.join(" ")}`,
    };
  }

  try {
    const result = await execPreflightCommand(config.wpCliBin, args);
    return {
      key: "wp_plugin_list",
      label: "wp plugin list dry check",
      passed: true,
      message: "WordPress plugin list command succeeded.",
      command: result.command,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error) {
    return failedCheck(
      "wp_plugin_list",
      "wp plugin list dry check",
      error,
      `${config.wpCliBin} ${args.join(" ")}`
    );
  }
}

async function execPreflightCommand(command: string, args: string[]): Promise<CommandResult> {
  const printable = [command, ...args].join(" ");
  const { stdout, stderr } = await execFileAsync(command, args, {
    cwd: process.cwd(),
    windowsHide: true,
    timeout: 60_000,
    maxBuffer: 1024 * 1024,
  });

  return { command: printable, stdout, stderr, dryRun: false };
}

function failedCheck(key: string, label: string, error: unknown, command?: string): PreflightCheck {
  return {
    key,
    label,
    passed: false,
    message: error instanceof Error ? error.message : "Preflight check failed.",
    command,
  };
}

async function fetchQueuedJobs(limit: number) {
  const now = new Date().toISOString();
  const { data: queued, error: queuedError } = await supabase
    .from("wordpress_deployments")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (queuedError) throw queuedError;

  const runnableQueued = (queued ?? []).filter(shouldWorkerProcessJob);
  const remaining = Math.max(0, limit - runnableQueued.length);
  if (remaining === 0) return runnableQueued;

  const { data: retryable, error: retryError } = await supabase
    .from("wordpress_deployments")
    .select("*")
    .eq("status", "failed")
    .order("created_at", { ascending: true })
    .limit(Math.max(remaining * 3, remaining));

  if (retryError) throw retryError;
  const retryableNow = (retryable ?? [])
    .filter((job) => (job.retry_count ?? 0) < (job.max_retries ?? 3))
    .filter((job) => !job.next_retry_at || job.next_retry_at <= now)
    .slice(0, remaining);

  return [...runnableQueued, ...retryableNow.filter(shouldWorkerProcessJob)];
}

function shouldWorkerProcessJob(job: Deployment) {
  if (config.dryRun || !config.requireJobConfirmation) return true;
  return isDeploymentConfirmed(job);
}

async function processDeployment(job: Deployment, preflight: PreflightResult) {
  if (!config.dryRun && config.requireJobConfirmation && !isDeploymentConfirmed(job)) {
    await updateDeployment(job.id, {
      status: "failed",
      failed_at: new Date().toISOString(),
      last_attempt_at: new Date().toISOString(),
      error_message: "Real deployment requires explicit deployment confirmation.",
      output: appendLog(job.output, {
        at: new Date().toISOString(),
        level: "error",
        message:
          "REAL_DEPLOYMENT is enabled, but this job is not confirmed. Refusing to execute WP-CLI commands.",
        dryRun: false,
      }),
    });
    await updateSite(job, "failed");
    console.error(`[wordpress-worker] refused unconfirmed real deployment=${job.id}`);
    return;
  }

  const claimed = await claimJob(job);
  if (!claimed) {
    console.log(`[wordpress-worker] skipped deployment=${job.id}; already claimed`);
    return;
  }

  console.log(`[wordpress-worker] processing deployment=${job.id}`);

  try {
    await updateDeployment(job.id, {
      output: appendPreflightLogs(claimed.output, preflight),
    });
    await ensureSteps(job);
    const steps = await getSteps(job.id);

    for (const stepConfig of WORDPRESS_DEPLOYMENT_STEPS) {
      const step = steps.find((item) => item.step_key === stepConfig.key);
      if (!step) throw new Error(`Missing deployment step: ${stepConfig.key}`);
      await processStep(job, step, stepConfig.key);
    }

    await updateDeployment(job.id, {
      status: "completed",
      completed_at: new Date().toISOString(),
      output: appendLog(job.output, {
        at: new Date().toISOString(),
        level: "info",
        message: "WordPress deployment worker completed all steps.",
        dryRun: config.dryRun,
      }),
    });
    await updateSite(job, "completed");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown deployment worker error";
    await rollbackDeployment(job, message);
    const retryCount = (job.retry_count ?? 0) + 1;
    const maxRetries = job.max_retries ?? 3;
    const retryable = retryCount < maxRetries;
    await updateDeployment(job.id, {
      status: retryable ? "queued" : "failed",
      failed_at: new Date().toISOString(),
      retry_count: retryCount,
      next_retry_at: retryable ? nextRetryAt(retryCount) : null,
      error_message: message,
      output: appendLog(job.output, {
        at: new Date().toISOString(),
        level: retryable ? "warn" : "error",
        message: retryable
          ? `${message}. Scheduled retry ${retryCount}/${maxRetries}.`
          : `${message}. Max retries reached.`,
        dryRun: config.dryRun,
      }),
    });
    await updateSite(job, "failed");
    console.error(`[wordpress-worker] failed deployment=${job.id}`, error);
  }
}

async function failDeploymentForPreflight(job: Deployment, preflight: PreflightResult) {
  const failedLabels = preflight.checks
    .filter((check) => !check.passed)
    .map((check) => `${check.label}: ${check.message}`)
    .join("; ");

  await updateDeployment(job.id, {
    status: "failed",
    failed_at: new Date().toISOString(),
    last_attempt_at: new Date().toISOString(),
    error_message: `Preflight failed: ${failedLabels}`,
    output: appendPreflightLogs(job.output, preflight),
  });
  await updateSite(job, "failed");
}

async function claimJob(job: Deployment) {
  const { data, error } = await supabase
    .from("wordpress_deployments")
    .update({
      status: "validating",
      started_at: new Date().toISOString(),
      last_attempt_at: new Date().toISOString(),
      output: appendLog(job.output, {
        at: new Date().toISOString(),
        level: "info",
        message: "Deployment claimed by worker.",
        dryRun: config.dryRun,
      }) as Json,
    })
    .eq("id", job.id)
    .in("status", ["queued", "failed"])
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function ensureSteps(job: Deployment) {
  const existing = await getSteps(job.id);
  const existingKeys = new Set(existing.map((step) => step.step_key));
  const missing = WORDPRESS_DEPLOYMENT_STEPS
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => !existingKeys.has(step.key));

  if (missing.length === 0) return;

  const { error } = await supabase.from("wordpress_deployment_steps").insert(
    missing.map(({ step, index }) => ({
      deployment_id: job.id,
      project_id: job.project_id,
      step_key: step.key,
      label: step.label,
      order_index: index,
      status: "pending" satisfies StepStatus,
      metadata: {},
    }))
  );

  if (error) throw error;
}

async function getSteps(deploymentId: string) {
  const { data, error } = await supabase
    .from("wordpress_deployment_steps")
    .select("*")
    .eq("deployment_id", deploymentId)
    .order("order_index", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

async function processStep(
  job: Deployment,
  step: DeploymentStep,
  stepKey: WordPressDeploymentStepKey
) {
  const deploymentStatus = STEP_TO_DEPLOYMENT_STATUS[stepKey];
  if (deploymentStatus) {
    await updateDeployment(job.id, { status: deploymentStatus });
  }

  await updateStep(step.id, {
    status: "running",
    started_at: new Date().toISOString(),
    metadata: appendLog(step.metadata, {
      at: new Date().toISOString(),
      level: "info",
      message: `Starting step: ${step.label}`,
      dryRun: config.dryRun,
    }),
  });

  try {
    const commandLogs = await runStepCommand(job, stepKey);
    const currentStep = await getStepById(step.id);
    const completedMetadata = commandLogs.reduce(
      (metadata, log) => appendLog(metadata, log),
      currentStep?.metadata ?? step.metadata
    );
    await updateStep(step.id, {
      status: "completed",
      completed_at: new Date().toISOString(),
      metadata: appendLog(completedMetadata, {
        at: new Date().toISOString(),
        level: "info",
        message: `Completed step: ${step.label}`,
        dryRun: config.dryRun,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown step error";
    const currentStep = await getStepById(step.id);
    await updateStep(step.id, {
      status: "failed",
      completed_at: new Date().toISOString(),
      error_message: message,
      metadata: appendLog(currentStep?.metadata ?? step.metadata, {
        at: new Date().toISOString(),
        level: "error",
        message,
        dryRun: config.dryRun,
      }),
    });
    throw error;
  }
}

async function runStepCommand(job: Deployment, stepKey: WordPressDeploymentStepKey) {
  const plan = getPlan(job);
  const setup = plan.setup;
  const wp = (args: string[]) => runCommand(config.wpCliBin, [...args, ...wpPathArgs()]);
  const logs: WorkerLog[] = [];
  const record = async (promise: Promise<CommandResult>) => {
    const result = await promise;
    logs.push(commandResultToLog(result));
  };

  switch (stepKey) {
    case "create_wordpress":
      await record(
        plan.deploymentMode === "managed_hosting"
          ? createManagedWordPressContainer(job, plan)
          : checkExistingWordPressInstallation()
      );
      break;
    case "create_admin":
      await record(ensureAdminUser(plan.adminUsername, plan.adminEmail));
      break;
    case "upload_plugin_zip":
      await record(uploadPluginZip());
      break;
    case "install_plugin":
      await record(wp(["plugin", "install", config.uploadedPluginZipPath, "--force"]));
      break;
    case "activate_plugin":
      await record(wp(["plugin", "activate", "ai-real-estate-property-manager"]));
      break;
    case "run_setup_wizard":
      await record(wp([
        "eval",
        `AI_Real_Estate_Property_Manager::instance()->run_initial_setup(${phpArray(setup)});`,
      ]));
      await record(configureSeoDefaults(plan.seo));
      break;
    case "import_elementor":
      await record(prepareElementorTemplateImport());
      break;
    case "connect_domain":
      await record(connectDomain(job.requested_domain || plan.domain));
      break;
  }

  return logs;
}

function wpPathArgs() {
  return config.wordpressPath ? [`--path=${config.wordpressPath}`] : [];
}

async function createManagedWordPressContainer(
  job: Deployment,
  plan: ReturnType<typeof getPlan>
) {
  const projectName = `ai-site-${job.project_id.slice(0, 8)}`;
  const domain = job.requested_domain || plan.domain || `${projectName}.${process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "ourdomain.com"}`;

  if (config.dryRun) {
    return runCommand("managed-docker-plan", [
      "create-network",
      "create-db",
      "create-wordpress-container",
      `project=${projectName}`,
      `domain=${domain}`,
    ]);
  }

  if (process.env.MANAGED_HOSTING_DOCKER_ENABLED !== "true") {
    throw new Error("Managed hosting real deployment requires MANAGED_HOSTING_DOCKER_ENABLED=true.");
  }

  return runCommand("docker", [
    "compose",
    "-p",
    projectName,
    "-f",
    process.env.MANAGED_HOSTING_COMPOSE_FILE || "docker-compose.wordpress.yml",
    "up",
    "-d",
  ]);
}

async function checkExistingWordPressInstallation() {
  return runCommand(config.wpCliBin, ["core", "is-installed", ...wpPathArgs()]);
}

async function uploadPluginZip() {
  await access(config.pluginZipPath);
  if (!config.wordpressPath) {
    return runCommand("upload-plugin-zip", [config.pluginZipPath]);
  }

  const targetDir = path.dirname(config.uploadedPluginZipPath);

  if (config.dryRun) {
    return runCommand("copy", [config.pluginZipPath, config.uploadedPluginZipPath]);
  }

  await mkdir(targetDir, { recursive: true });
  await copyFile(config.pluginZipPath, config.uploadedPluginZipPath);
  return {
    command: `copy ${config.pluginZipPath} ${config.uploadedPluginZipPath}`,
    stdout: "",
    stderr: "",
    dryRun: false,
  };
}

async function prepareElementorTemplateImport() {
  try {
    await access(config.elementorTemplatePath);
  } catch {
    return runCommand("prepare-elementor-template", [
      "missing-template-placeholder",
      config.elementorTemplatePath,
    ]);
  }

  if (config.dryRun) {
    return runCommand("wp", ["elementor", "library", "import", config.elementorTemplatePath, ...wpPathArgs()]);
  }

  return runCommand(config.wpCliBin, [
    "elementor",
    "library",
    "import",
    config.elementorTemplatePath,
    ...wpPathArgs(),
  ]);
}

async function connectDomain(domain?: string | null) {
  if (!domain) {
    return runCommand("connect-domain", ["no-domain-requested"]);
  }

  if (!process.env.DOMAIN_PROVIDER || !process.env.DOMAIN_PROVIDER_API_TOKEN) {
    return runCommand("connect-domain", [domain, "dry-run-no-provider-credentials"]);
  }

  return runCommand("connect-domain", [domain, process.env.DOMAIN_PROVIDER]);
}

async function configureSeoDefaults(seo: { title: string; description: string; keywords: string[] }) {
  const keywords = seo.keywords.join(", ");
  if (config.dryRun) {
    return runCommand("configure-seo-defaults", [seo.title, seo.description, keywords]);
  }

  await runCommand(config.wpCliBin, ["option", "update", "blogname", seo.title, ...wpPathArgs()]);
  await runCommand(config.wpCliBin, ["option", "update", "blogdescription", seo.description, ...wpPathArgs()]);
  return runCommand(config.wpCliBin, ["option", "update", "ai_builder_seo_keywords", keywords, ...wpPathArgs()]);
}

async function ensureAdminUser(username: string, email: string) {
  const exists = await runCommand(config.wpCliBin, ["user", "get", username, "--field=ID", ...wpPathArgs()], {
    allowFailure: true,
  });

  if (!exists.dryRun && exists.stdout.trim()) {
    return {
      command: `${config.wpCliBin} user get ${username} --field=ID ${wpPathArgs().join(" ")}`.trim(),
      stdout: `Admin user already exists: ${exists.stdout.trim()}`,
      stderr: exists.stderr,
      dryRun: false,
    };
  }

  return runCommand(config.wpCliBin, [
    "user",
    "create",
    username,
    email,
    "--role=administrator",
    `--user_pass=${process.env.WORDPRESS_ADMIN_PASSWORD || "dry-run-password"}`,
    ...wpPathArgs(),
  ]);
}

async function runCommand(
  command: string,
  args: string[],
  options: { allowFailure?: boolean } = {}
): Promise<CommandResult> {
  const printable = [command, ...args].join(" ");
  if (config.dryRun || isPseudoCommand(command)) {
    console.log(`[wordpress-worker:dry-run] ${printable}`);
    return { stdout: "", stderr: "", command: printable, dryRun: true };
  }

  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd: process.cwd(),
      windowsHide: true,
      timeout: 120_000,
      maxBuffer: 1024 * 1024,
    });

    if (stdout) console.log(stdout);
    if (stderr) console.warn(stderr);
    return { stdout, stderr, command: printable, dryRun: false };
  } catch (error) {
    if (options.allowFailure) {
      const stderr = error instanceof Error ? error.message : "Command failed";
      return { stdout: "__FAILED__", stderr, command: printable, dryRun: false };
    }

    throw error;
  }
}

function isPseudoCommand(command: string) {
  return [
    "copy",
    "upload-plugin-zip",
    "prepare-elementor-template",
    "connect-domain",
    "configure-seo-defaults",
    "managed-docker-plan",
  ].includes(command);
}

function commandResultToLog(result: CommandResult): WorkerLog {
  return {
    at: new Date().toISOString(),
    level: "info",
    message: `Executed: ${result.command}`,
    command: result.command,
    dryRun: result.dryRun,
    stdout: result.stdout.slice(0, 4000),
    stderr: result.stderr.slice(0, 4000),
  };
}

function nextRetryAt(retryCount: number) {
  const delayMinutes = Math.min(30, Math.max(1, 2 ** retryCount));
  return new Date(Date.now() + delayMinutes * 60_000).toISOString();
}

function isDeploymentConfirmed(job: Deployment) {
  const input = isRecord(job.input) ? job.input : {};
  const output = isRecord(job.output) ? job.output : {};
  const metadata = isRecord(output.metadata) ? output.metadata : {};
  return (
    input.deploymentConfirmed === true ||
    input.confirmationStatus === "confirmed" ||
    input.realDeploymentConfirmed === true ||
    metadata.deploymentConfirmed === true
  );
}

async function rollbackDeployment(job: Deployment, reason: string) {
  const logs: WorkerLog[] = [
    {
      at: new Date().toISOString(),
      level: "warn",
      message: `Starting non-destructive rollback: ${reason}`,
      dryRun: config.dryRun,
    },
  ];

  try {
    const deactivate = await runCommand(
      config.wpCliBin,
      ["plugin", "deactivate", "ai-real-estate-property-manager", ...wpPathArgs()],
      { allowFailure: true }
    );
    logs.push(commandResultToLog(deactivate));

    if (config.uploadedPluginZipPath && config.wordpressPath) {
      if (config.dryRun) {
        logs.push(commandResultToLog(await runCommand("rollback-remove-uploaded-zip", [config.uploadedPluginZipPath])));
      } else {
        await rm(config.uploadedPluginZipPath, { force: true });
        logs.push({
          at: new Date().toISOString(),
          level: "info",
          message: `Removed uploaded plugin ZIP: ${config.uploadedPluginZipPath}`,
          dryRun: false,
        });
      }
    }
  } catch (rollbackError) {
    logs.push({
      at: new Date().toISOString(),
      level: "error",
      message: rollbackError instanceof Error ? rollbackError.message : "Rollback failed",
      dryRun: config.dryRun,
    });
  }

  const nextOutput = logs.reduce((output, log) => appendLog(output, log), job.output);
  await updateDeployment(job.id, { output: nextOutput });
}

function getPlan(job: Deployment) {
  const input = isRecord(job.input) ? job.input : {};
  const plan = isRecord(input.plan) ? input.plan : {};
  const setup = isRecord(plan.setup) ? plan.setup : {};
  const seo = isRecord(plan.seo) ? plan.seo : {};

  return {
    adminUsername: stringValue(plan.adminUsername, process.env.WORDPRESS_DEFAULT_ADMIN_USERNAME || "site-admin"),
    adminEmail: stringValue(plan.adminEmail, process.env.WORDPRESS_DEFAULT_ADMIN_EMAIL || "admin@example.com"),
    domain: typeof plan.domain === "string" ? plan.domain : undefined,
    deploymentMode: plan.deploymentMode === "existing_hosting" ? "existing_hosting" : "managed_hosting",
    seo: {
      title: stringValue(
        seo.title,
        stringValue(plan.siteName, "AI 부동산 웹사이트")
      ),
      description: stringValue(
        seo.description,
        "AI로 생성한 부동산 웹사이트입니다."
      ),
      keywords: Array.isArray(seo.keywords)
        ? seo.keywords.filter((value): value is string => typeof value === "string")
        : [],
    },
    setup: {
      business_type: stringValue(setup.businessType, "factory"),
      company_name: stringValue(setup.companyName, "AI 부동산"),
      main_color: stringValue(setup.mainColor, "#1f7a4d"),
      region: stringValue(setup.region, "창원·김해·부산"),
    },
  };
}

function phpArray(values: Record<string, string>) {
  const entries = Object.entries(values)
    .map(([key, value]) => `"${escapePhp(key)}" => "${escapePhp(value)}"`)
    .join(", ");
  return `array(${entries})`;
}

function escapePhp(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function appendLog(data: Json, log: WorkerLog): Json {
  const base = isRecord(data) ? data : {};
  const logs = Array.isArray(base.logs) ? base.logs : [];
  return {
    ...base,
    logs: [...logs, log] as Json,
    dryRun: config.dryRun,
    updatedAt: log.at,
  } as Json;
}

function appendPreflightLogs(data: Json, preflight: PreflightResult): Json {
  const logs: WorkerLog[] = [
    {
      at: new Date().toISOString(),
      level: preflight.passed ? "info" : "error",
      message: preflight.passed
        ? "WordPress deployment preflight passed."
        : "WordPress deployment preflight failed.",
      dryRun: config.dryRun,
    },
    ...preflight.checks.map((check): WorkerLog => ({
      at: new Date().toISOString(),
      level: check.passed ? "info" : "error",
      message: `${check.label}: ${check.message}`,
      command: check.command,
      dryRun: config.dryRun,
      stdout: check.stdout?.slice(0, 4000),
      stderr: check.stderr?.slice(0, 4000),
    })),
  ];

  return logs.reduce((output, log) => appendLog(output, log), data);
}

async function getStepById(stepId: string) {
  const { data, error } = await supabase
    .from("wordpress_deployment_steps")
    .select("*")
    .eq("id", stepId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function updateDeployment(
  deploymentId: string,
  data: Database["public"]["Tables"]["wordpress_deployments"]["Update"]
) {
  const { error } = await supabase
    .from("wordpress_deployments")
    .update(data)
    .eq("id", deploymentId);
  if (error) throw error;
}

async function updateStep(
  stepId: string,
  data: Database["public"]["Tables"]["wordpress_deployment_steps"]["Update"]
) {
  const { error } = await supabase
    .from("wordpress_deployment_steps")
    .update(data)
    .eq("id", stepId);
  if (error) throw error;
}

async function updateSite(job: Deployment, status: DeploymentStatus) {
  if (!job.site_id) return;
  const completedUrls = status === "completed" ? getCompletedSiteUrls(job) : {};
  const { error } = await supabase
    .from("wordpress_sites")
    .update({
      status,
      wp_install_path: config.wordpressPath || null,
      ...completedUrls,
    })
    .eq("id", job.site_id);
  if (error) throw error;
}

function getCompletedSiteUrls(job: Deployment) {
  const plan = getPlan(job);
  const rawDomain = job.requested_domain || plan.domain || process.env.WORDPRESS_SITE_URL || "";
  if (!rawDomain) return {};
  const normalized = rawDomain.replace(/\/$/, "");
  const siteUrl = normalized.startsWith("http://") || normalized.startsWith("https://")
    ? normalized
    : `https://${normalized}`;
  return {
    site_url: siteUrl,
    admin_url: `${siteUrl}/wp-admin/`,
  };
}

main().catch((error) => {
  console.error("[wordpress-worker] fatal", error);
  process.exitCode = 1;
});
