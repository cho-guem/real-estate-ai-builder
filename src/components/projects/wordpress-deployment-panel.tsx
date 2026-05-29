"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Circle, Cloud, Loader2, PlayCircle, Server, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Tables } from "@/types/database.types";
import { WORDPRESS_DEPLOYMENT_STEPS } from "@/types/wordpress-deployment.types";

type DeploymentPanelProps = {
  projectId: string;
  projectName: string;
  userEmail?: string | null;
  initialSite: Tables<"wordpress_sites"> | null;
  initialDeployment: Tables<"wordpress_deployments"> | null;
  initialSteps: Tables<"wordpress_deployment_steps">[];
};

type PreflightCheck = {
  key: string;
  label: string;
  status: "success" | "error" | "warning";
  passed: boolean;
  message: string;
  help?: string;
};

type PreflightResult = {
  passed: boolean;
  checkedAt: string;
  checks: PreflightCheck[];
};

const STATUS_LABELS: Record<string, string> = {
  draft: "설치 준비 완료",
  queued: "대기중",
  validating: "검증중",
  deploying: "배포중",
  importing: "가져오는 중",
  configuring: "설정중",
  provisioning_wordpress: "홈페이지 생성중",
  installing_plugin: "플러그인 설치중",
  running_setup: "설정 실행중",
  importing_elementor: "디자인 적용중",
  connecting_domain: "도메인 연결중",
  completed: "완료",
  failed: "실패",
  canceled: "취소됨",
};

export function WordPressDeploymentPanel({
  projectId,
  projectName,
  userEmail,
  initialSite,
  initialDeployment,
  initialSteps,
}: DeploymentPanelProps) {
  const deploymentMode = initialDeployment ? getDeploymentMode(initialDeployment) : getSiteDeploymentMode(initialSite);
  const [domain, setDomain] = useState(initialSite?.domain ?? "");
  const [adminEmail, setAdminEmail] = useState(userEmail ?? initialSite?.admin_email ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDryRunTesting, setIsDryRunTesting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [site, setSite] = useState(initialSite);
  const [deployment, setDeployment] = useState(initialDeployment);
  const [steps, setSteps] = useState(initialSteps);
  const [message, setMessage] = useState<string | null>(null);
  const [preflightResult, setPreflightResult] = useState<PreflightResult | null>(null);

  const stepByKey = useMemo(
    () => new Map(steps.map((step) => [step.step_key, step])),
    [steps]
  );
  const logs = getDeploymentLogs(deployment);
  const canRunRealDeployment = Boolean(preflightResult?.passed && adminEmail);

  useEffect(() => {
    if (!deployment || ["completed", "failed", "canceled"].includes(deployment.status)) return;

    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/projects/${projectId}/wordpress-deployments`);
      if (!response.ok) return;
      const snapshot = await response.json();
      setSite(snapshot.site);
      setDeployment(snapshot.deployment);
      setSteps(snapshot.steps ?? []);
    }, 2500);

    return () => window.clearInterval(interval);
  }, [projectId, deployment]);

  async function runDryRunTest() {
    setIsDryRunTesting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/wordpress-preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deploymentMode }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "사전 점검에 실패했습니다.");
      setPreflightResult(payload);
      setMessage(payload.passed ? "사전 점검이 완료되었습니다. 홈페이지 설치를 시작할 수 있습니다." : "사전 점검에서 확인이 필요한 항목이 있습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "사전 점검 중 알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsDryRunTesting(false);
    }
  }

  async function startDeployment() {
    setIsSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/wordpress-deployments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: domain || undefined,
           companyName: projectName,
          adminEmail,
          provider: deploymentMode === "managed_hosting" ? "managed_host" : "wp_cli",
          deploymentMode,
          deploymentConfirmed: true,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "홈페이지 설치 요청에 실패했습니다.");
      }

      const payload = await response.json();
      setSite(payload.site);
      setDeployment(payload.deployment);
      setSteps(payload.steps ?? []);
      setIsConfirmOpen(false);
      setMessage("홈페이지 설치 요청이 접수되었습니다. 설치 진행 상태에서 현재 단계를 확인할 수 있습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">홈페이지 자동 설치</h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {deploymentMode === "managed_hosting"
              ? "서버 설정 없이 몇 분 안에 홈페이지를 자동 생성합니다."
              : "현재 사용 중인 홈페이지에 AI 기능과 디자인을 연결합니다."}
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-muted px-3 py-1 text-xs font-medium">
          {STATUS_LABELS[deployment?.status ?? site?.status ?? "draft"]}
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">연결 도메인</span>
          <input
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            placeholder="example.com"
            className="h-10 rounded-lg border bg-background px-3 text-sm"
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">관리자 이메일</span>
          <input
            value={adminEmail}
            onChange={(event) => setAdminEmail(event.target.value)}
            placeholder="admin@example.com"
            className="h-10 rounded-lg border bg-background px-3 text-sm"
          />
        </label>
        <Button
          type="button"
          variant="outline"
          onClick={runDryRunTest}
          disabled={isDryRunTesting}
          className="self-end"
        >
          {isDryRunTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          사전 점검
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          onClick={startDeployment}
          disabled={!canRunRealDeployment || isSubmitting}
        >
          <PlayCircle className="h-4 w-4" />
          홈페이지 설치 시작
        </Button>
      </div>

      {message && (
        <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          {message}
        </div>
      )}

      {preflightResult && (
        <div className="mt-5 rounded-xl border bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {preflightResult.passed ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <h3 className="text-sm font-semibold">사전 점검 결과</h3>
            </div>
            <span className="text-xs text-muted-foreground">
              {preflightResult.passed ? "통과" : "설정 필요"}
            </span>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {preflightResult.checks.map((check) => (
              <div key={check.key} className={getPreflightCardClass(check.status)}>
                <div className="flex items-center gap-2">
                  {check.status === "success" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : check.status === "warning" ? (
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  )}
                  <span className="text-xs font-semibold">{check.label}</span>
                </div>
                <p className="mt-1 break-words text-xs text-muted-foreground">{check.message}</p>
                {check.help && <p className="mt-1 text-xs">{check.help}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {WORDPRESS_DEPLOYMENT_STEPS.map((step) => {
          const row = stepByKey.get(step.key);
          const done = row?.status === "completed";
          const running = row?.status === "running";
          return (
            <div key={step.key} className="rounded-lg border bg-background p-4">
              <div className="flex items-center gap-2">
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : running ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">{step.label}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{row?.status ?? "pending"}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          실제 설치 전에는 반드시 사전 점검을 먼저 진행합니다. 기존 사이트를 사용하는 경우 현재 홈페이지가 덮어써지지 않도록
          설치 가능 여부를 먼저 확인합니다.
        </p>
      </div>

      {(site?.site_url || site?.admin_url) && (
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">배포 URL</p>
          {site.site_url && <p className="mt-1">사이트: {site.site_url}</p>}
          {site.admin_url && <p className="mt-1">관리자: {site.admin_url}</p>}
        </div>
      )}

      <div className="mt-5 rounded-lg border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold">설치 진행 상태</h3>
        <div className="mt-3 max-h-64 space-y-2 overflow-auto">
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground">아직 진행 내역이 없습니다.</p>
          ) : (
            logs.map((log, index) => (
              <div key={`${log.at}-${index}`} className="rounded-md bg-background p-2 text-xs">
                <div className="flex justify-between gap-2">
                  <span className={log.level === "error" ? "font-semibold text-destructive" : "font-semibold"}>
                    {log.level.toUpperCase()}
                  </span>
                  <span className="text-muted-foreground">{new Date(log.at).toLocaleTimeString("ko-KR")}</span>
                </div>
                <p className="mt-1 text-muted-foreground">{log.message}</p>
              </div>
            ))
          )}
        </div>
      </div>

     
    </section>
  );
}

function getPreflightCardClass(status: PreflightCheck["status"]) {
  if (status === "success") return "rounded-lg border border-emerald-200 bg-emerald-50/70 p-3";
  if (status === "warning") return "rounded-lg border border-amber-200 bg-amber-50/80 p-3";
  return "rounded-lg border border-destructive/30 bg-destructive/10 p-3";
}

function getDeploymentMode(deployment: Tables<"wordpress_deployments">) {
  const input = deployment.input;
  if (!input || typeof input !== "object" || Array.isArray(input)) return "managed_hosting";
  const plan = input.plan;
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return "managed_hosting";
  return plan.deploymentMode === "existing_hosting" ? "existing_hosting" : "managed_hosting";
}

function getSiteDeploymentMode(site: Tables<"wordpress_sites"> | null) {
  const metadata = site?.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "managed_hosting";
  const plan = metadata.plan;
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return "managed_hosting";
  return plan.deploymentMode === "existing_hosting" ? "existing_hosting" : "managed_hosting";
}

function getDeploymentLogs(deployment: Tables<"wordpress_deployments"> | null) {
  const output = deployment?.output;
  if (!output || typeof output !== "object" || Array.isArray(output)) return [];
  const logs = output.logs;
  if (!Array.isArray(logs)) return [];
  return logs.filter(isLog);
}

function isLog(value: unknown): value is { at: string; level: string; message: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "at" in value &&
    "level" in value &&
    "message" in value &&
    typeof value.at === "string" &&
    typeof value.level === "string" &&
    typeof value.message === "string"
  );
}
