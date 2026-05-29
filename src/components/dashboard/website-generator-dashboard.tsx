"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  ExternalLink,
  Globe2,
  Loader2,
  MonitorSmartphone,
  Palette,
  PlayCircle,
  Rocket,
  Server,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  INDUSTRY_OPTIONS,
  REAL_ESTATE_SPECIALTIES,
  REAL_ESTATE_SPECIALTY_GUIDES,
  type Industry,
  type RealEstateSpecialty,
} from "@/config/project-options";

type RecentWebsite = {
  project: Tables<"projects">;
  site: Tables<"wordpress_sites"> | null;
  deployment: Tables<"wordpress_deployments"> | null;
  steps: Tables<"wordpress_deployment_steps">[];
};

type GeneratorDashboardProps = {
  recentWebsites: RecentWebsite[];
};

type GeneratorResult = {
  project: Tables<"projects">;
  site: Tables<"wordpress_sites"> | null;
  deployment: Tables<"wordpress_deployments"> | null;
  steps: Tables<"wordpress_deployment_steps">[];
};

type PreflightCheck = {
  key: string;
  label: string;
  status: "success" | "error" | "warning";
  passed: boolean;
  message: string;
  help?: string;
  command?: string;
};

type PreflightResult = {
  passed: boolean;
  checkedAt: string;
  checks: PreflightCheck[];
};

const DESIGN_STYLES = [
  { value: "premium", label: "프리미엄" },
  { value: "minimal", label: "미니멀" },
  { value: "corporate", label: "기업형" },
  { value: "bold", label: "강한 전환형" },
] as const;

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
  importing_elementor: "디자인 적용 준비중",
  connecting_domain: "도메인 연결중",
  completed: "완료",
  failed: "실패",
  canceled: "취소됨",
};

export function WebsiteGeneratorDashboard({ recentWebsites }: GeneratorDashboardProps) {
  const [industry, setIndustry] = useState<Industry>("real_estate");
  const [realEstateType, setRealEstateType] =
    useState<RealEstateSpecialty>("공장,창고,토지");
  const [companyName, setCompanyName] = useState("");
  const [region, setRegion] = useState("");
  const [brandColor, setBrandColor] = useState("#1f7a4d");
  const [designStyle, setDesignStyle] = useState("premium");
  const [domain, setDomain] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [deploymentMode, setDeploymentMode] = useState<"managed_hosting" | "existing_hosting">("managed_hosting");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDryRunTesting, setIsDryRunTesting] = useState(false);
  const [isRealDeploying, setIsRealDeploying] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dryRunError, setDryRunError] = useState<string | null>(null);
  const [realDeploymentError, setRealDeploymentError] = useState<string | null>(null);
  const [preflightResult, setPreflightResult] = useState<PreflightResult | null>(null);
  const [result, setResult] = useState<GeneratorResult | null>(null);

  const activeDeployment = result?.deployment ?? null;
  const stepByKey = useMemo(
    () => new Map((result?.steps ?? []).map((step) => [step.step_key, step])),
    [result?.steps]
  );
  const logs = getDeploymentLogs(activeDeployment);
  const canRunRealDeployment = Boolean(preflightResult?.passed && result?.project?.id);

  useEffect(() => {
    if (!result?.project?.id || !activeDeployment) return;
    if (["completed", "failed", "canceled"].includes(activeDeployment.status)) return;

    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/projects/${result.project.id}/wordpress-deployments`);
      if (!response.ok) return;
      const snapshot = await response.json();
      setResult((current) =>
        current
          ? {
              ...current,
              site: snapshot.site,
              deployment: snapshot.deployment,
              steps: snapshot.steps ?? [],
            }
          : current
      );
    }, 2500);

    return () => window.clearInterval(interval);
  }, [result?.project?.id, activeDeployment]);

  async function generateWebsite() {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/website-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry,
          businessType: realEstateType,
          realEstateType,
          companyName,
          region,
          brandColor,
          designStyle,
          domain,
          deploymentMode,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "웹사이트 생성 요청에 실패했습니다.");
      }

      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function runDryRunTest() {
    setIsDryRunTesting(true);
    setDryRunError(null);
    setRealDeploymentError(null);

    try {
      const response = await fetch("/api/wordpress-preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deploymentMode }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "사전 점검에 실패했습니다.");
      }

      setPreflightResult(payload);
    } catch (err) {
      setDryRunError(err instanceof Error ? err.message : "사전 점검 중 알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsDryRunTesting(false);
    }
  }

  async function runRealDeployment() {
    if (!result?.project?.id || !preflightResult?.passed) return;
    setIsRealDeploying(true);
    setRealDeploymentError(null);

    try {
      const response = await fetch(`/api/projects/${result.project.id}/wordpress-deployments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: deploymentMode === "managed_hosting" ? "managed_host" : "wp_cli",
          deploymentMode,
          domain: domain || undefined,
          adminEmail: adminEmail || undefined,
          adminUsername: "site-admin",
          businessType: realEstateType,
          companyName,
          mainColor: brandColor,
          region,
          deploymentConfirmed: true,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "실제 배포 요청 생성에 실패했습니다.");
      }

      setResult((current) =>
        current
          ? {
              ...current,
              site: payload.site,
              deployment: payload.deployment,
              steps: payload.steps ?? [],
            }
          : {
              project: result.project,
              site: payload.site,
              deployment: payload.deployment,
              steps: payload.steps ?? [],
            }
      );
      setIsConfirmOpen(false);
    } catch (err) {
      setRealDeploymentError(err instanceof Error ? err.message : "실제 배포 요청 중 알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsRealDeploying(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="p-6 lg:p-8">
            <Badge variant="secondary" className="mb-4 gap-1">
              <Rocket className="h-3.5 w-3.5" />
              AI Website Builder
            </Badge>
            <h1 className="max-w-2xl text-3xl font-bold tracking-tight lg:text-4xl">
              AI가 홈페이지를 자동으로 만들어드립니다
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground lg:text-base">
              복잡한 설치 없이 회사 정보만 입력하면 홈페이지 제작부터 설정까지 자동으로 진행됩니다.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <OnboardingStep step="STEP 1" title="회사 정보 입력" />
              <OnboardingStep step="STEP 2" title="AI 자동 제작" />
              <OnboardingStep step="STEP 3" title="홈페이지 바로 사용" />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <MetricCard icon={Globe2} label="고객별 관리" value="홈페이지별 분리" />
              <MetricCard icon={Server} label="자동 설치" value="제작부터 설정까지" />
              <MetricCard icon={MonitorSmartphone} label="반응형" value="모바일 최적화" />
            </div>
          </div>

          <div className="border-t bg-muted/20 p-6 lg:border-l lg:border-t-0 lg:p-8">
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">업종 선택</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {INDUSTRY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={!option.enabled}
                      onClick={() => option.enabled && setIndustry(option.value)}
                      className={
                        industry === option.value
                          ? "rounded-lg border border-primary bg-primary/5 p-3 text-left text-sm ring-2 ring-primary/15"
                          : "rounded-lg border bg-background p-3 text-left text-sm hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
                      }
                    >
                      <span className="flex items-center justify-between gap-2 font-semibold">
                        {option.label}
                        {!option.enabled && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            준비중
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              {industry === "real_estate" && (
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">부동산 세부 유형</label>
                  <NativeSelect
                    value={realEstateType}
                    onChange={(value) => setRealEstateType(value as RealEstateSpecialty)}
                    options={REAL_ESTATE_SPECIALTIES.map((value) => ({ value, label: value }))}
                  />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {REAL_ESTATE_SPECIALTY_GUIDES[realEstateType]}
                  </p>
                </div>
              )}
              <div className="grid gap-2">
                <label className="text-sm font-medium">홈페이지 시작 방식</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setDeploymentMode("managed_hosting")}
                    className={
                      deploymentMode === "managed_hosting"
                        ? "rounded-lg border border-primary bg-primary/5 p-3 text-left text-sm ring-2 ring-primary/15"
                        : "rounded-lg border bg-background p-3 text-left text-sm hover:bg-muted/40"
                    }
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      🚀 AI 자동 제작형
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">추천</span>
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">서버 설정 없이 몇 분 안에 홈페이지를 자동 생성합니다.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeploymentMode("existing_hosting")}
                    className={
                      deploymentMode === "existing_hosting"
                        ? "rounded-lg border border-primary bg-primary/5 p-3 text-left text-sm ring-2 ring-primary/15"
                        : "rounded-lg border bg-background p-3 text-left text-sm hover:bg-muted/40"
                    }
                  >
                    <span className="font-semibold">🔗 기존 사이트 연결형</span>
                    <span className="mt-1 block text-xs text-muted-foreground">현재 사용 중인 홈페이지에 AI 기능과 디자인을 연결합니다.</span>
                  </button>
                </div>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">회사명</label>
                <Input
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="예: 다다솔 부동산"
                  className="h-10"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">지역</label>
                <Input
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                  placeholder="예: 창원·김해·부산"
                  className="h-10"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">브랜드 컬러</label>
                  <div className="flex h-10 items-center gap-2 rounded-lg border bg-background px-2">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(event) => setBrandColor(event.target.value)}
                      className="h-7 w-10 cursor-pointer border-0 bg-transparent p-0"
                    />
                    <span className="text-sm text-muted-foreground">{brandColor}</span>
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">디자인 스타일</label>
                  <NativeSelect value={designStyle} onChange={setDesignStyle} options={DESIGN_STYLES} />
                </div>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">연결 도메인 선택 입력</label>
                <Input
                  value={domain}
                  onChange={(event) => setDomain(event.target.value)}
                  placeholder="example.com"
                  className="h-10"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">관리자 이메일</label>
                <Input
                  value={adminEmail}
                  onChange={(event) => setAdminEmail(event.target.value)}
                  placeholder="admin@example.com"
                  className="h-10"
                />
              </div>

              {error && (
                <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              {dryRunError && (
                <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {dryRunError}
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={runDryRunTest}
                  disabled={isDryRunTesting}
                  className="h-11 w-full"
                >
                  {isDryRunTesting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  사전 점검
                </Button>
                <Button
                  type="button"
                  size="lg"
                  onClick={generateWebsite}
                  disabled={isGenerating || !companyName || !region}
                  className="h-11 w-full"
                >
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                  AI 홈페이지 생성
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {preflightResult && <PreflightResultPanel result={preflightResult} />}

      {result && (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-semibold">설치 진행 상태</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {result.project.name} 홈페이지 제작 요청이 저장되었습니다.
                </p>
              </div>
              <DeploymentBadge status={activeDeployment?.status ?? "queued"} />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {WORDPRESS_DEPLOYMENT_STEPS.map((step) => {
                const row = stepByKey.get(step.key);
                return <DeploymentStepCard key={step.key} label={step.label} status={row?.status ?? "pending"} />;
              })}
            </div>

            <div className="mt-5 rounded-xl border bg-muted/20 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-sm font-semibold">홈페이지 자동 설치</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    사전 점검이 완료되면 홈페이지 설치를 시작할 수 있습니다.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="outline" onClick={runDryRunTest} disabled={isDryRunTesting}>
                    {isDryRunTesting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    사전 점검
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setIsConfirmOpen(true)}
                    disabled={!canRunRealDeployment || isRealDeploying}
                  >
                    <PlayCircle className="h-4 w-4" />
                    홈페이지 설치 시작
                  </Button>
                </div>
              </div>
              {!preflightResult?.passed && (
                <p className="mt-3 text-xs text-muted-foreground">
                  실패 항목을 해결한 뒤 사전 점검을 다시 실행해주세요.
                </p>
              )}
              {realDeploymentError && (
                <div className="mt-3 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {realDeploymentError}
                </div>
              )}
            </div>

            {activeDeployment?.status === "completed" && (
              <StateNotice
                type="success"
                title="웹사이트 배포 준비가 완료되었습니다"
                body="홈페이지 생성 단계가 완료되었습니다. 프로젝트 상세에서 패키지와 설치 상태를 계속 관리할 수 있습니다."
                projectId={result.project.id}
              />
            )}

            {activeDeployment?.status === "failed" && (
              <StateNotice
                type="error"
                title="배포 중 오류가 발생했습니다"
                body={activeDeployment.error_message || "배포 로그를 확인하고 다시 시도해주세요."}
                projectId={result.project.id}
              />
            )}
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold">설치 진행 상태</h2>
            <p className="mt-1 text-sm text-muted-foreground">홈페이지 설치가 어디까지 진행됐는지 확인할 수 있습니다.</p>
            <div className="mt-4 max-h-[420px] space-y-2 overflow-auto rounded-xl bg-muted/40 p-3">
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">아직 로그가 없습니다. 워커가 실행되면 여기에 표시됩니다.</p>
              ) : (
                logs.map((log, index) => (
                  <div key={`${log.at}-${index}`} className="rounded-lg bg-background p-3 text-xs">
                    <div className="flex items-center justify-between gap-3">
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
      )}

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>홈페이지 설치를 시작할까요?</DialogTitle>
            <DialogDescription>
              사전 점검 결과를 바탕으로 홈페이지 제작과 설치를 시작합니다. 완료 후 관리 화면에서 진행 상태를 확인할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium">{companyName || result?.project.name}</p>
            <p className="mt-1 text-muted-foreground">{domain || "도메인 미설정"} · {region || "지역 미설정"}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={isRealDeploying}>
              취소
            </Button>
            <Button type="button" onClick={runRealDeployment} disabled={isRealDeploying || !preflightResult?.passed}>
              {isRealDeploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              설치 시작
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">최근 생성한 홈페이지</h2>
            <p className="mt-1 text-sm text-muted-foreground">최근 생성한 고객 웹사이트와 배포 상태입니다.</p>
          </div>
        </div>
        {recentWebsites.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
            <Palette className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <h3 className="font-semibold">아직 생성된 웹사이트가 없습니다</h3>
            <p className="mt-1 text-sm text-muted-foreground">첫 웹사이트를 생성하면 이곳에 표시됩니다.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recentWebsites.map(({ project, deployment, site }) => (
              <article key={project.id} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{project.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {getConfigText(project.config, "region")} · {getConfigText(project.config, "realEstateType")}
                    </p>
                  </div>
                  <DeploymentBadge status={deployment?.status ?? site?.status ?? "draft"} />
                </div>
                <div className="mt-4 flex items-center justify-between border-t pt-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(project.created_at).toLocaleDateString("ko-KR")}
                  </span>
                  <Link href={`/projects/${project.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                    홈페이지 관리 <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function NativeSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function OnboardingStep({ step, title }: { step: string; title: string }) {
  return (
    <div className="rounded-xl border bg-background/70 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{step}</p>
      <p className="mt-2 text-sm font-semibold">{title}</p>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Globe2; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/70 p-4">
      <Icon className="mb-3 h-5 w-5 text-primary" />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function DeploymentBadge({ status }: { status: string }) {
  const failed = status === "failed";
  const completed = status === "completed";
  return (
    <Badge variant={failed ? "destructive" : completed ? "default" : "secondary"} className="shrink-0">
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function DeploymentStepCard({ label, status }: { label: string; status: string }) {
  const completed = status === "completed";
  const running = status === "running";
  const failed = status === "failed";
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex items-center gap-2">
        {completed ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : running ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : failed ? (
          <AlertCircle className="h-4 w-4 text-destructive" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{status === "pending" ? "대기중" : status}</p>
    </div>
  );
}

function PreflightResultPanel({ result }: { result: PreflightResult }) {
  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            {result.passed ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <h2 className="font-semibold">사전 점검 결과</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.passed
              ? "모든 항목이 통과했습니다. 홈페이지 설치를 시작할 수 있습니다."
              : "실패 항목을 해결한 뒤 다시 테스트해주세요."}
          </p>
        </div>
        <Badge variant={result.passed ? "default" : "destructive"}>
          {result.passed ? "실제 배포 가능" : "설정 필요"}
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {result.checks.map((check) => (
          <div
            key={check.key}
            className={getPreflightCardClass(check.status)}
          >
            <div className="flex items-center gap-2">
              {check.status === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              ) : check.status === "warning" ? (
                <AlertCircle className="h-4 w-4 text-amber-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              <h3 className="text-sm font-semibold">{check.label}</h3>
            </div>
            <p className="mt-2 break-words text-xs text-muted-foreground">{check.message}</p>
            {check.help && <p className="mt-2 text-xs font-medium">{check.help}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function getPreflightCardClass(status: PreflightCheck["status"]) {
  if (status === "success") return "rounded-xl border border-emerald-200 bg-emerald-50/70 p-4";
  if (status === "warning") return "rounded-xl border border-amber-200 bg-amber-50/80 p-4";
  return "rounded-xl border border-destructive/30 bg-destructive/10 p-4";
}

function StateNotice({
  type,
  title,
  body,
  projectId,
}: {
  type: "success" | "error";
  title: string;
  body: string;
  projectId: string;
}) {
  const success = type === "success";
  return (
    <div
      className={
        success
          ? "mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
          : "mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive"
      }
    >
      <div className="flex gap-2">
        {success ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <AlertCircle className="mt-0.5 h-4 w-4" />}
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm opacity-80">{body}</p>
          <Link href={`/projects/${projectId}`} className="mt-3 inline-flex text-sm font-semibold underline">
            프로젝트 상세로 이동
          </Link>
        </div>
      </div>
    </div>
  );
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

function getConfigText(config: unknown, key: string) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return "미설정";
  const value = (config as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : "미설정";
}
