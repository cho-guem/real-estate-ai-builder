"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChevronDown } from "lucide-react";
import { createProjectAction, type ProjectActionState } from "@/app/actions/project.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
  TARGET_AUDIENCES,
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
  const fe = state.fieldErrors ?? {};

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

      {/* 매물 정보 */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          매물 정보
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>중심 매물 유형</Label>
            <FormSelect
              name="propertyType"
              placeholder="유형 선택"
              options={PROPERTY_TYPES}
              disabled={pending}
              error={fe.propertyType}
            />
          </div>

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
        </div>

        <div className="space-y-1.5">
          <Label>타깃 고객</Label>
          <FormSelect
            name="targetAudience"
            placeholder="주요 타깃 고객 선택"
            options={TARGET_AUDIENCES}
            disabled={pending}
            error={fe.targetAudience}
          />
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
          {pending ? "생성 중..." : "프로젝트 생성하기"}
        </Button>
      </div>
    </form>
  );
}
