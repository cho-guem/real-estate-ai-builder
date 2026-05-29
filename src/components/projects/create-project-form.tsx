"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, Loader2, Server, Wrench } from "lucide-react";
import { createProjectAction, type ProjectActionState } from "@/app/actions/project.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  INDUSTRY_OPTIONS,
  REAL_ESTATE_SPECIALTIES,
  REAL_ESTATE_SPECIALTY_GUIDES,
  TRANSACTION_TYPES,
  TARGET_AUDIENCES,
  mapSpecialtyToPropertyType,
  type Industry,
  type RealEstateSpecialty,
} from "@/config/project-options";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// Native select styled to match shadcn Input
// ─────────────────────────────────────────────

function FormSelect({
  name,
  placeholder,
  options,
  disabled,
  error,
}: {
  name: string;
  placeholder: string;
  options: readonly string[];
  disabled?: boolean;
  error?: string;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <select
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          className={cn(
            "h-9 w-full cursor-pointer appearance-none rounded-lg border bg-transparent pl-3 pr-9 text-sm outline-none transition-colors",
            "focus:border-ring focus:ring-2 focus:ring-ring/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-destructive" : "border-input",
            value === "" ? "text-muted-foreground" : "text-foreground"
          )}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
// Field wrapper
// ─────────────────────────────────────────────

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main form
// ─────────────────────────────────────────────

const initialState: ProjectActionState = {};

export function CreateProjectForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(createProjectAction, initialState);
  const [deploymentMode, setDeploymentMode] = useState<"managed_hosting" | "existing_hosting">("managed_hosting");
  const [industry, setIndustry] = useState<Industry>("real_estate");
  const [realEstateType, setRealEstateType] =
    useState<RealEstateSpecialty>("공장,창고,토지");
  const fe = state.fieldErrors ?? {};
  const selectedGuide = REAL_ESTATE_SPECIALTY_GUIDES[realEstateType];

  return (
    <form action={action} className="space-y-6">
      {state.error && !Object.values(fe).some(Boolean) && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      {/* 기본 정보 */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          기본 정보
        </h2>

        <Field label="프로젝트명" htmlFor="name" error={fe.name} hint="예: 강남 프리미엄 아파트 웹사이트">
          <Input
            id="name"
            name="name"
            placeholder="프로젝트 이름을 입력해주세요"
            disabled={pending}
            className={fe.name ? "border-destructive" : ""}
          />
        </Field>

        <Field label="지역" htmlFor="region" error={fe.region} hint="예: 서울 강남구, 부산 해운대구">
          <Input
            id="region"
            name="region"
            placeholder="지역을 입력해주세요"
            disabled={pending}
            className={fe.region ? "border-destructive" : ""}
          />
        </Field>
      </section>

      {/* 업종 선택 */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          업종 선택
        </h2>

        <input type="hidden" name="industry" value={industry} />
        <input type="hidden" name="realEstateType" value={realEstateType} />
        <input type="hidden" name="propertySpecialty" value={realEstateType} />
        <input type="hidden" name="propertyType" value={mapSpecialtyToPropertyType(realEstateType)} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRY_OPTIONS.map((option) => (
            <IndustryCard
              key={option.value}
              label={option.label}
              enabled={option.enabled}
              selected={industry === option.value}
              disabled={pending}
              onSelect={() => option.enabled && setIndustry(option.value)}
            />
          ))}
        </div>
        {fe.industry && <p className="text-xs text-destructive">{fe.industry}</p>}

        {industry === "real_estate" && (
          <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
            <div>
              <Label>부동산 세부 유형</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                세부 유형에 따라 AI 에이전트의 벤치마킹, 기능, SEO, 디자인 프리셋이 달라집니다.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {REAL_ESTATE_SPECIALTIES.map((specialty) => (
                <button
                  key={specialty}
                  type="button"
                  disabled={pending}
                  onClick={() => setRealEstateType(specialty)}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    "hover:border-primary/50 hover:bg-background",
                    realEstateType === specialty
                      ? "border-primary bg-primary/5 ring-2 ring-primary/15"
                      : "border-input bg-background/60"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {realEstateType === specialty ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border" />
                    )}
                    <span className="font-semibold">{specialty}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {REAL_ESTATE_SPECIALTY_GUIDES[specialty]}
                  </p>
                </button>
              ))}
            </div>
            <div className="rounded-lg border bg-background p-3 text-sm text-muted-foreground">
              {selectedGuide}
            </div>
            {fe.realEstateType && <p className="text-xs text-destructive">{fe.realEstateType}</p>}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>거래 유형</Label>
            <FormSelect
              name="transactionType"
              placeholder="거래 유형 선택"
              options={TRANSACTION_TYPES}
              disabled={pending}
              error={fe.transactionType}
            />
          </div>

          <div className="space-y-1.5">
            <Label>주요 고객</Label>
            <FormSelect
              name="targetAudience"
              placeholder="주요 고객 선택"
              options={TARGET_AUDIENCES}
              disabled={pending}
              error={fe.targetAudience}
            />
          </div>
        </div>
      </section>

      {/* 사이트 목적 */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          사이트 목적
        </h2>

        <Field
          label="사이트 목적"
          htmlFor="purpose"
          error={fe.purpose}
          hint="AI가 웹사이트를 생성할 때 참고하는 핵심 정보예요."
        >
          <Textarea
            id="purpose"
            name="purpose"
            placeholder="예: 강남 지역 30-40대 직장인을 대상으로 프리미엄 아파트 매물을 소개하는 브랜드 사이트를 만들고 싶어요."
            rows={4}
            disabled={pending}
            className={cn("resize-none", fe.purpose ? "border-destructive" : "")}
          />
        </Field>
      </section>

      {/* 사이트 설치 방식 */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          홈페이지 시작 방식
        </h2>
        <input type="hidden" name="deploymentMode" value={deploymentMode} />
        <div className="grid gap-3 lg:grid-cols-2">
          <DeploymentModeCard
            icon={Server}
            title="🚀 AI 자동 제작형"
            badge="추천"
            description="서버 설정 없이 몇 분 안에 홈페이지를 자동 생성합니다."
            selected={deploymentMode === "managed_hosting"}
            disabled={pending}
            onSelect={() => setDeploymentMode("managed_hosting")}
          />
          <DeploymentModeCard
            icon={Wrench}
            title="🔗 기존 사이트 연결형"
            badge="기존 사이트 보유 고객"
            description="현재 사용 중인 홈페이지에 AI 기능과 디자인을 연결합니다."
            selected={deploymentMode === "existing_hosting"}
            disabled={pending}
            onSelect={() => setDeploymentMode("existing_hosting")}
          />
        </div>
        {fe.deploymentMode && <p className="text-xs text-destructive">{fe.deploymentMode}</p>}
      </section>

      {/* 액션 버튼 */}
      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => router.push("/projects")}
        >
          취소
        </Button>
        <Button type="submit" disabled={pending} className="sm:min-w-36">
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {pending ? "생성 중..." : "AI 홈페이지 생성"}
        </Button>
      </div>
    </form>
  );
}

function IndustryCard({
  label,
  enabled,
  selected,
  disabled,
  onSelect,
}: {
  label: string;
  enabled: boolean;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled || !enabled}
      onClick={onSelect}
      className={cn(
        "min-h-24 rounded-xl border p-4 text-left transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-70",
        enabled && "hover:border-primary/50 hover:bg-muted/30",
        selected ? "border-primary bg-primary/5 ring-2 ring-primary/15" : "border-input bg-background"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold">{label}</span>
        {!enabled && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            준비중
          </span>
        )}
        {enabled && selected && <CheckCircle2 className="h-4 w-4 text-primary" />}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {enabled
          ? "현재 활성화된 업종입니다. 부동산 세부 유형을 선택해 홈페이지 제작을 시작할 수 있습니다."
          : "곧 업종별 AI 홈페이지 제작 프리셋이 제공됩니다."}
      </p>
    </button>
  );
}

function DeploymentModeCard({
  icon: Icon,
  title,
  badge,
  description,
  selected,
  disabled,
  onSelect,
}: {
  icon: typeof Server;
  title: string;
  badge: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex h-full min-h-40 flex-col rounded-xl border p-4 text-left transition-colors",
        "hover:border-primary/50 hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-60",
        selected ? "border-primary bg-primary/5 ring-2 ring-primary/15" : "border-input bg-background"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <span className="font-semibold">{title}</span>
        </div>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
          {badge}
        </span>
      </div>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-4 flex items-center gap-2 text-xs font-medium">
        {selected ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <span className="h-4 w-4 rounded-full border" />}
        {selected ? "선택됨" : "선택하기"}
      </div>
    </button>
  );
}
