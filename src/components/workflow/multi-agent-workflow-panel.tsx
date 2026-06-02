"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Clock3,
  Database,
  ExternalLink,
  GripVertical,
  Loader2,
  Lock,
  Plus,
  Play,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import { WORKFLOW_STEPS } from "@/config/workflow-steps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AiGenerationPanel } from "@/components/projects/ai-generation-panel";
import { LandingPreviewRenderer, buildPreviewValidation } from "@/components/workflow/landing-preview-renderer";
import { cn } from "@/lib/utils";
import { buildGeneratedSiteData, isGeneratedSiteData } from "@/lib/generated-site";
import type { ProjectConfig } from "@/config/project-options";
import type { GeneratedContent } from "@/types/generation.types";
import type { GeneratedSiteData } from "@/types/generated-site.types";
import type { Json, Tables } from "@/types/database.types";
import type { WorkflowSnapshot } from "@/types/workflow.types";

type StepRow = Tables<"generation_steps">;
type ArtifactRow = Tables<"website_artifacts">;
type StepStatus = StepRow["status"];

type WorkflowApiResult =
  | { ok: true; workflow: WorkflowSnapshot }
  | { ok: false; error: string; code?: string };

type WorkflowAction =
  | { action: "select_benchmarks"; selectedCandidateIds: string[] }
  | { action: "analyze_custom_benchmark"; customUrl: string }
  | { action: "approve_architecture"; menus: Json }
  | { action: "save_features"; features: Json }
  | { action: "approve_ux_flow"; notes?: string; revisionRequest?: string }
  | { action: "approve_seo"; title: string; metaDescription: string; keywords: string[] }
  | {
      action: "approve_brand";
      positioning: string;
      toneKeywords: string[];
      targetAudience: string;
    }
  | {
      action: "approve_design";
      selectedPaletteId: string;
      selectedTypographyId: string;
      selectedLayoutId: string;
      logoAsset?: string;
      brandImageAsset?: string;
    }
  | { action: "generate_landing" }
  | { action: "complete_review"; checklist: Json; score: number; issues: string[] };

const STATUS_LABEL: Record<StepStatus, string> = {
  pending: "대기중",
  running: "실행중",
  completed: "완료",
  failed: "실패",
  skipped: "건너뜀",
};

const RUN_STATUS_LABEL: Record<string, string> = {
  queued: "대기중",
  running: "실행중",
  waiting_for_user: "사용자 확인 대기",
  completed: "완료",
  failed: "실패",
  canceled: "취소됨",
};

function isObject(value: Json | null | undefined): value is Record<string, Json | undefined> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: Json | undefined): string {
  return typeof value === "string" ? value : "";
}

function readStringArray(value: Json | undefined): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readObjectArray(value: Json | undefined): Array<Record<string, Json | undefined>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, Json | undefined> => isObject(item))
    : [];
}

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === "running") return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-destructive" />;
  if (status === "skipped") return <Circle className="h-4 w-4 text-muted-foreground" />;
  return <Clock3 className="h-4 w-4 text-muted-foreground" />;
}

function statusBadgeVariant(status: StepStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") return "default";
  if (status === "running") return "secondary";
  if (status === "failed") return "destructive";
  return "outline";
}

function JsonPreview({ data }: { data: Json | null }) {
  return (
    <pre className="max-h-72 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm text-muted-foreground">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function LockedStep({ message }: { message: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-dashed bg-muted/20 p-4 text-sm leading-relaxed text-muted-foreground">
      <Lock className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function BenchmarkSelection({
  artifact,
  onAction,
}: {
  artifact: ArtifactRow;
  onAction: (action: WorkflowAction) => Promise<void>;
}) {
  const data = isObject(artifact.data) ? artifact.data : {};
  const candidates = readObjectArray(data.candidates);
  const [selectedIds, setSelectedIds] = useState(() => readStringArray(data.selectedCandidateIds));
  const [customUrl, setCustomUrl] = useState(readString(data.customBenchmarkUrl));
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [notice, setNotice] = useState(readString(data.selectionMessage));
  const customAnalysis = isObject(data.customBenchmarkAnalysis) ? data.customBenchmarkAnalysis : {};

  async function saveSelection() {
    setIsSaving(true);
    try {
      await onAction({ action: "select_benchmarks", selectedCandidateIds: selectedIds });
      setNotice("선택한 벤치마킹 스타일이 다음 단계에 반영됩니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function analyzeCustomUrl() {
    if (!customUrl.trim()) return;
    setIsAnalyzing(true);
    try {
      await onAction({ action: "analyze_custom_benchmark", customUrl: customUrl.trim() });
      setNotice("입력한 벤치마킹 URL을 기준으로 사이트 구조 분석이 완료되었습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function selectSingleStyle(id: string) {
    setSelectedIds([id]);
    setIsSaving(true);
    try {
      await onAction({ action: "select_benchmarks", selectedCandidateIds: [id] });
      setNotice("선택한 벤치마킹 스타일이 다음 단계에 반영됩니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold">{readString(data.title)}</h4>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{readString(data.summary)}</p>
      </div>
      <div className="rounded-xl border bg-muted/20 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="text-sm font-medium">직접 참고할 벤치마크 URL</label>
            <Input
              value={customUrl}
              onChange={(event) => setCustomUrl(event.target.value)}
              placeholder="https://land.naver.com"
              className="mt-2"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              URL을 입력하면 목업 분석으로 히어로, CTA, 섹션 구조가 유사한 후보를 생성합니다.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={analyzeCustomUrl}
            disabled={!customUrl.trim() || isAnalyzing}
            className="gap-1.5"
          >
            {isAnalyzing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            URL 분석
          </Button>
        </div>
      </div>
      {(notice || readString(customAnalysis.message)) && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {notice || readString(customAnalysis.message)}
        </div>
      )}
      {readString(data.benchmarkUrl) && (
        <div className="rounded-xl border bg-background p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold">URL 기반 mock 분석 결과</p>
              <p className="mt-1 break-all text-xs text-muted-foreground">{readString(data.benchmarkUrl)}</p>
            </div>
            <Badge variant="secondary">분석 완료</Badge>
          </div>
          <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs font-semibold text-muted-foreground">Hero Copy</p>
              <p className="mt-1">{readString(customAnalysis.heroCopy)}</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs font-semibold text-muted-foreground">CTA Style</p>
              <p className="mt-1">{readString(customAnalysis.ctaStyle)}</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs font-semibold text-muted-foreground">Section Structure</p>
              <p className="mt-1">{readStringArray(customAnalysis.sectionStructure).join(" / ")}</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs font-semibold text-muted-foreground">Menu Structure</p>
              <p className="mt-1">{readStringArray(customAnalysis.menuStructure).join(" / ")}</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs font-semibold text-muted-foreground">Color Tone</p>
              <p className="mt-1">{readString(customAnalysis.colorTone)}</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs font-semibold text-muted-foreground">Layout Notes</p>
              <p className="mt-1">{readString(customAnalysis.layoutNotes)}</p>
            </div>
          </div>
        </div>
      )}
      <div className="grid gap-3 xl:grid-cols-2">
        {candidates.map((candidate) => {
          const id = readString(candidate.id);
          const selected = selectedIds.includes(id);
          const websiteUrl = readString(candidate.websiteUrl);
          return (
            <div
              key={id}
              className={cn(
                "group overflow-hidden rounded-xl border bg-background text-left shadow-sm transition",
                selected ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40"
              )}
            >
              <div className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{readString(candidate.siteName)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {readString(candidate.category)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={selected ? "default" : "outline"}>
                        적합도 {typeof candidate.fitScore === "number" ? candidate.fitScore : 0}
                      </Badge>
                      {selected && <Badge>선택됨</Badge>}
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {readString(candidate.description)}
                  </p>
                  <p className="mt-2 rounded-lg border bg-background px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">구조 메모 </span>
                    {readString(candidate.layoutPattern) || "신뢰 카피, 추천 매물, 문의 CTA를 한 화면에 배치합니다."}
                  </p>
                  <p className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">활용 이유 </span>
                    {readString(candidate.whyUseful)}
                  </p>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    <div>
                      <p className="font-semibold">강점</p>
                      <BulletList items={readStringArray(candidate.strengths).slice(0, 2)} />
                    </div>
                    <div>
                      <p className="font-semibold">차용 포인트</p>
                      <BulletList items={readStringArray(candidate.borrow).slice(0, 2)} />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {websiteUrl && (
                      <a
                        href={websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition hover:bg-muted"
                      >
                        라이브 사이트 보기
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => selectSingleStyle(id)}
                      disabled={isSaving}
                      className="gap-1.5"
                    >
                      {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
                      이 스타일 선택
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedIds((prev) =>
                          prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
                        );
                      }}
                    >
                      {selected ? "선택 해제" : "비교에 추가"}
                    </Button>
                  </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3">
        <p className="text-sm text-muted-foreground">
          {selectedIds.length > 0
            ? `${selectedIds.length}개 벤치마크를 선택했습니다.`
            : "최소 1개 이상의 벤치마크 사이트를 선택하세요."}
        </p>
        <Button onClick={saveSelection} disabled={selectedIds.length === 0 || isSaving} className="gap-1.5">
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          선택 완료
        </Button>
      </div>
    </div>
  );
}

type MenuItem = { id: string; label: string; submenus: string[] };

function SiteArchitectureEditor({
  artifact,
  onAction,
}: {
  artifact: ArtifactRow;
  onAction: (action: WorkflowAction) => Promise<void>;
}) {
  const data = isObject(artifact.data) ? artifact.data : {};
  const [menus, setMenus] = useState<MenuItem[]>(() =>
    readObjectArray(data.menus).map((menu, index) => ({
      id: readString(menu.id) || `menu-${index}`,
      label: readString(menu.label),
      submenus: readStringArray(menu.submenus),
    }))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function updateMenu(index: number, patch: Partial<MenuItem>) {
    setMenus((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function moveMenu(index: number, direction: -1 | 1) {
    setMenus((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function dropMenu(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    setMenus((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
  }

  async function approve() {
    setIsSaving(true);
    try {
      await onAction({ action: "approve_architecture", menus: menus as unknown as Json });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold">{readString(data.title)}</h4>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{readString(data.summary)}</p>
      </div>
      <div className="space-y-3">
        {menus.map((menu, index) => (
          <div
            key={menu.id}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => dropMenu(index)}
            onDragEnd={() => setDragIndex(null)}
            className={cn(
              "rounded-xl border bg-background p-3 transition",
              dragIndex === index && "opacity-60 ring-2 ring-primary/20"
            )}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
              <Input
                value={menu.label}
                onChange={(event) => updateMenu(index, { label: event.target.value })}
                className="font-medium"
              />
              <Button variant="outline" size="icon-sm" onClick={() => moveMenu(index, -1)} disabled={index === 0}>
                ↑
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => moveMenu(index, 1)}
                disabled={index === menus.length - 1}
              >
                ↓
              </Button>
              <Button
                variant="destructive"
                size="icon-sm"
                onClick={() => setMenus((prev) => prev.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="mt-3 space-y-2 pl-6">
              {menu.submenus.map((submenu, subIndex) => (
                <div key={`${menu.id}-${subIndex}`} className="flex gap-2">
                  <Input
                    value={submenu}
                    onChange={(event) => {
                      const nextSubmenus = [...menu.submenus];
                      nextSubmenus[subIndex] = event.target.value;
                      updateMenu(index, { submenus: nextSubmenus });
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() =>
                      updateMenu(index, {
                        submenus: menu.submenus.filter((_, i) => i !== subIndex),
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateMenu(index, { submenus: [...menu.submenus, "새 하위 메뉴"] })}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                하위 메뉴 추가
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between gap-3">
        <Button
          variant="outline"
          onClick={() =>
            setMenus((prev) => [
              ...prev,
              { id: `menu-${Date.now()}`, label: "새 메뉴", submenus: ["하위 메뉴"] },
            ])
          }
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          메뉴 추가
        </Button>
        <Button onClick={approve} disabled={menus.length === 0 || isSaving} className="gap-1.5">
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          구조 승인
        </Button>
      </div>
    </div>
  );
}

function FeaturePlanningSelector({
  artifact,
  onAction,
}: {
  artifact: ArtifactRow;
  onAction: (action: WorkflowAction) => Promise<void>;
}) {
  const data = isObject(artifact.data) ? artifact.data : {};
  const [features, setFeatures] = useState<Array<Record<string, Json | undefined>>>(() =>
    readObjectArray(data.coreFeatures)
  );
  const [isSaving, setIsSaving] = useState(false);

  function updateFeature(index: number, patch: Record<string, Json>) {
    setFeatures((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function moveFeature(index: number, direction: -1 | 1) {
    setFeatures((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save() {
    setIsSaving(true);
    try {
      await onAction({ action: "save_features", features: features as unknown as Json });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold">{readString(data.title)}</h4>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{readString(data.summary)}</p>
      </div>
      <div className="space-y-3">
        {features.map((feature, index) => {
          const enabled = feature.enabled !== false;
          return (
            <div
              key={`${readString(feature.id)}-${index}`}
              className={cn(
                "rounded-xl border bg-background p-3 transition",
                enabled ? "border-primary/30" : "opacity-60"
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(event) => updateFeature(index, { enabled: event.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                  사용
                </label>
                <div className="grid flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_120px]">
                  <Input
                    value={readString(feature.name)}
                    onChange={(event) => updateFeature(index, { name: event.target.value })}
                    className="font-medium"
                  />
                  <select
                    value={readString(feature.priority)}
                    onChange={(event) => updateFeature(index, { priority: event.target.value })}
                    className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
                  >
                    <option value="필수">필수</option>
                    <option value="권장">권장</option>
                    <option value="선택">선택</option>
                  </select>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon-sm" onClick={() => moveFeature(index, -1)} disabled={index === 0}>
                    ↑
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => moveFeature(index, 1)}
                    disabled={index === features.length - 1}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    onClick={() => setFeatures((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <Input
                value={readString(feature.purpose)}
                onChange={(event) => updateFeature(index, { purpose: event.target.value })}
                className="mt-2"
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between gap-3">
        <Button
          variant="outline"
          onClick={() =>
            setFeatures((prev) => [
              ...prev,
              {
                id: `feature-${Date.now()}`,
                enabled: true,
                name: "새 기능",
                purpose: "이 기능의 목적을 입력하세요.",
                priority: "선택",
              },
            ])
          }
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          커스텀 기능 추가
        </Button>
        <Button onClick={save} disabled={features.length === 0 || isSaving} className="gap-1.5">
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          기능 선택 저장
        </Button>
      </div>
    </div>
  );
}

function UxFlowApproval({
  artifact,
  onAction,
}: {
  artifact: ArtifactRow;
  onAction: (action: WorkflowAction) => Promise<void>;
}) {
  const data = isObject(artifact.data) ? artifact.data : {};
  const flows = readObjectArray(data.flows);
  const [notes, setNotes] = useState(readString(data.notes));
  const [revisionRequest, setRevisionRequest] = useState(readString(data.revisionRequest));
  const [isSaving, setIsSaving] = useState(false);

  async function approve() {
    setIsSaving(true);
    try {
      await onAction({ action: "approve_ux_flow", notes, revisionRequest });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold">{readString(data.title)}</h4>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{readString(data.summary)}</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {flows.map((flow, index) => (
          <div key={`${readString(flow.name)}-${index}`} className="rounded-xl border bg-background p-4">
            <p className="font-medium">{readString(flow.name)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{readString(flow.goal)}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {readStringArray(flow.steps).map((step) => (
                <span key={step} className="rounded-md bg-muted px-2 py-1 text-xs">
                  {step}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          모바일 UX 권장사항
        </p>
        <BulletList items={readStringArray(data.mobileRecommendations)} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm font-medium">승인 메모</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            placeholder="승인 시 참고할 메모를 입력하세요."
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">수정 요청</span>
          <textarea
            value={revisionRequest}
            onChange={(event) => setRevisionRequest(event.target.value)}
            rows={4}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            placeholder="보완이 필요한 흐름이나 화면을 적어주세요."
          />
        </label>
      </div>
      <div className="flex justify-end">
        <Button onClick={approve} disabled={isSaving} className="gap-1.5">
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          UX 흐름 승인
        </Button>
      </div>
    </div>
  );
}

function EditableChipList({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  function addItem() {
    const next = draft.trim();
    if (!next || items.includes(next)) return;
    onChange([...items, next]);
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(items.filter((current) => current !== item))}
            className="rounded-full border bg-background px-3 py-1 text-xs font-medium transition hover:border-destructive/50 hover:text-destructive"
            title="클릭하면 삭제됩니다"
          >
            {item} ×
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItem();
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" onClick={addItem} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          추가
        </Button>
      </div>
    </div>
  );
}

function SeoStrategyEditor({
  artifact,
  onAction,
}: {
  artifact: ArtifactRow;
  onAction: (action: WorkflowAction) => Promise<void>;
}) {
  const data = isObject(artifact.data) ? artifact.data : {};
  const [title, setTitle] = useState(readString(data.title));
  const [metaDescription, setMetaDescription] = useState(readString(data.metaDescription));
  const [keywords, setKeywords] = useState(() => [
    ...readStringArray(data.primaryKeywords),
    ...readStringArray(data.secondaryKeywords),
  ]);
  const [isSaving, setIsSaving] = useState(false);

  async function approve() {
    setIsSaving(true);
    try {
      await onAction({ action: "approve_seo", title, metaDescription, keywords });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm font-medium">SEO 제목</span>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">메타 설명</span>
          <textarea
            value={metaDescription}
            onChange={(event) => setMetaDescription(event.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </label>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">검색 키워드</p>
        <EditableChipList
          items={keywords}
          onChange={setKeywords}
          placeholder="예: 강남 사무실 임대"
        />
      </div>
      <div className="flex justify-end">
        <Button onClick={approve} disabled={isSaving || !title.trim() || !metaDescription.trim()} className="gap-1.5">
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          SEO 전략 승인
        </Button>
      </div>
    </div>
  );
}

function BrandStrategyEditor({
  artifact,
  onAction,
}: {
  artifact: ArtifactRow;
  onAction: (action: WorkflowAction) => Promise<void>;
}) {
  const data = isObject(artifact.data) ? artifact.data : {};
  const [positioning, setPositioning] = useState(readString(data.positioning));
  const [targetAudience, setTargetAudience] = useState(readString(data.audience));
  const [toneKeywords, setToneKeywords] = useState(() => readStringArray(data.toneKeywords));
  const [isSaving, setIsSaving] = useState(false);

  async function approve() {
    setIsSaving(true);
    try {
      await onAction({
        action: "approve_brand",
        positioning,
        toneKeywords,
        targetAudience,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold">{readString(data.name)}</h4>
        <p className="mt-1 text-sm text-muted-foreground">{readString(data.voice)}</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm font-medium">브랜드 포지셔닝</span>
          <textarea
            value={positioning}
            onChange={(event) => setPositioning(event.target.value)}
            rows={4}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">타깃 고객</span>
          <textarea
            value={targetAudience}
            onChange={(event) => setTargetAudience(event.target.value)}
            rows={4}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </label>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">톤 키워드</p>
        <EditableChipList
          items={toneKeywords}
          onChange={setToneKeywords}
          placeholder="예: 신뢰감 있는"
        />
      </div>
      <div className="flex justify-end">
        <Button onClick={approve} disabled={isSaving || !positioning.trim()} className="gap-1.5">
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          브랜드 전략 승인
        </Button>
      </div>
    </div>
  );
}

function DesignOptionGroup({
  title,
  options,
  selectedId,
  onSelect,
}: {
  title: string;
  options: Array<Record<string, Json | undefined>>;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      {options.length === 0 && (
        <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-sm text-muted-foreground">
          선택 가능한 옵션이 아직 준비되지 않았습니다.
        </div>
      )}
      <div className="grid gap-2 lg:grid-cols-3">
        {options.map((option) => {
          const id = readString(option.id);
          const selected = id === selectedId;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(id)}
              className={cn(
                "relative rounded-xl border bg-background p-3 text-left transition",
                selected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/25"
                  : "hover:border-primary/40 hover:bg-muted/20"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{readString(option.name)}</p>
                {selected && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
                    <CheckCircle2 className="h-3 w-3" />
                    선택됨
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {readString(option.description)}
              </p>
              {Array.isArray(option.colors) && (
                <div className="mt-3 flex gap-1.5">
                  {readStringArray(option.colors).map((color) => (
                    <span
                      key={color}
                      className="h-6 w-6 rounded-full border shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DesignSystemSelector({
  artifact,
  onAction,
}: {
  artifact: ArtifactRow;
  onAction: (action: WorkflowAction) => Promise<void>;
}) {
  const data = isObject(artifact.data) ? artifact.data : {};
  const paletteOptions = readObjectArray(data.paletteOptions);
  const typographyOptions = readObjectArray(data.typographyOptions);
  const layoutOptions = readObjectArray(data.layoutOptions);
  const [selectedPaletteId, setSelectedPaletteId] = useState(readString(data.selectedPaletteId));
  const [selectedTypographyId, setSelectedTypographyId] = useState(readString(data.selectedTypographyId));
  const [selectedLayoutId, setSelectedLayoutId] = useState(readString(data.selectedLayoutId));
  const [isSaving, setIsSaving] = useState(false);

  async function approve() {
    setIsSaving(true);
    try {
      await onAction({
        action: "approve_design",
        selectedPaletteId,
        selectedTypographyId,
        selectedLayoutId,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">{readString(data.direction)}</p>
      <DesignOptionGroup
        title="컬러 팔레트"
        options={paletteOptions}
        selectedId={selectedPaletteId}
        onSelect={setSelectedPaletteId}
      />
      <DesignOptionGroup
        title="타이포그래피 스타일"
        options={typographyOptions}
        selectedId={selectedTypographyId}
        onSelect={setSelectedTypographyId}
      />
      <DesignOptionGroup
        title="레이아웃 스타일"
        options={layoutOptions}
        selectedId={selectedLayoutId}
        onSelect={setSelectedLayoutId}
      />
      <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        이미지는 홈페이지 생성 후 관리자 화면에서 교체할 수 있습니다.
      </div>
      <div className="flex justify-end">
        <Button
          onClick={approve}
          disabled={isSaving || !selectedPaletteId || !selectedTypographyId || !selectedLayoutId}
          className="gap-1.5"
        >
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          디자인 승인
        </Button>
      </div>
    </div>
  );
}

function LandingGenerationAction({
  artifact,
  stepStatus,
  onAction,
}: {
  artifact: ArtifactRow;
  stepStatus: StepStatus;
  onAction: (action: WorkflowAction) => Promise<void>;
}) {
  const data = isObject(artifact.data) ? artifact.data : {};
  const sections = readObjectArray(data.sections);
  const generated = data.generated === true || stepStatus === "completed";
  const [isGenerating, setIsGenerating] = useState(false);

  async function generate() {
    setIsGenerating(true);
    try {
      await onAction({ action: "generate_landing" });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold">{readString(data.headline)}</h4>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{readString(data.subheadline)}</p>
      </div>
      {!generated ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 p-4">
          <p className="text-sm text-muted-foreground">
            모든 기획 승인이 완료되었습니다. 선택한 전략을 바탕으로 목업 랜딩페이지 산출물을 생성합니다.
          </p>
          <Button onClick={generate} disabled={isGenerating} className="shrink-0 gap-1.5">
            {isGenerating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            랜딩페이지 생성
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((section, index) => (
            <div key={`${readString(section.key)}-${index}`} className="rounded-lg bg-muted/30 p-3">
              <p className="text-sm font-medium">{readString(section.title)}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {readString(section.body)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCompletion({
  artifact,
  onAction,
  generatedSite,
}: {
  artifact: ArtifactRow;
  onAction: (action: WorkflowAction) => Promise<void>;
  generatedSite?: GeneratedSiteData;
}) {
  const data = isObject(artifact.data) ? artifact.data : {};
  const previewValidation = useMemo(() => buildPreviewValidation(generatedSite), [generatedSite]);
  const [score, setScore] = useState(
    typeof data.score === "number" ? data.score : 80
  );
  const [checklist, setChecklist] = useState(() => {
    const items = readObjectArray(data.checklist);
    return items.length > 0
      ? items.map((item) => ({
          label: readString(item.label),
          passed: item.passed === true,
        }))
      : previewValidation.checks.map((check) => ({ label: check.label, passed: check.passed }));
  });
  const [issues, setIssues] = useState(() => [
    ...new Set([...previewValidation.issues, ...readStringArray(data.issues), ...readStringArray(data.warnings)]),
  ]);
  const [draftIssue, setDraftIssue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function addIssue() {
    const next = draftIssue.trim();
    if (!next) return;
    setIssues((current) => [...current, next]);
    setDraftIssue("");
  }

  async function complete() {
    setIsSaving(true);
    try {
      await onAction({
        action: "complete_review",
        checklist: checklist as unknown as Json,
        score,
        issues,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">검토 점수</p>
          <p className="mt-1 text-sm text-muted-foreground">{readString(data.summary)}</p>
        </div>
        <Input
          type="number"
          min={0}
          max={100}
          value={score}
          onChange={(event) => setScore(Number(event.target.value))}
          className="w-24"
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">검토 체크리스트</p>
        {checklist.map((item, index) => (
          <label key={`${item.label}-${index}`} className="flex items-center gap-2 rounded-lg border bg-background p-3 text-sm">
            <input
              type="checkbox"
              checked={item.passed}
              onChange={(event) => {
                const next = [...checklist];
                next[index] = { ...item, passed: event.target.checked };
                setChecklist(next);
              }}
              className="h-4 w-4 rounded border-input"
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">이슈 목록</p>
        <div className="space-y-2">
          {issues.map((issue, index) => (
            <div key={`${issue}-${index}`} className="flex items-center gap-2 rounded-lg border bg-background p-3 text-sm">
              <span className="flex-1">{issue}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIssues((current) => current.filter((_, itemIndex) => itemIndex !== index))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={draftIssue}
            onChange={(event) => setDraftIssue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addIssue();
              }
            }}
            placeholder="검토 이슈를 입력하세요."
          />
          <Button type="button" variant="outline" onClick={addIssue} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            추가
          </Button>
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={complete} disabled={isSaving} className="gap-1.5">
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          검토 완료
        </Button>
      </div>
    </div>
  );
}

function ArtifactRenderer({
  artifact,
  stepStatus,
  onAction,
  artifacts: _artifacts,
  generatedSite,
}: {
  artifact?: ArtifactRow;
  stepStatus: StepStatus;
  onAction: (action: WorkflowAction) => Promise<void>;
  artifacts: Map<string, ArtifactRow>;
  generatedSite?: GeneratedSiteData;
}) {
  if (!artifact) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
        이 에이전트가 완료되면 산출물이 여기에 표시됩니다.
      </div>
    );
  }

  const data = artifact.data;
  if (!isObject(data)) return <JsonPreview data={data} />;

  if (stepStatus === "pending") {
    return <LockedStep message="이전 기획 단계가 완료되면 이 단계가 열립니다." />;
  }

  if (artifact.artifact_type === "benchmark") {
    return <BenchmarkSelection artifact={artifact} onAction={onAction} />;
  }

  if (artifact.artifact_type === "site_architecture") {
    return <SiteArchitectureEditor artifact={artifact} onAction={onAction} />;
  }

  if (artifact.artifact_type === "feature_planning") {
    return <FeaturePlanningSelector artifact={artifact} onAction={onAction} />;
  }

  if (artifact.artifact_type === "ux_flow") {
    return <UxFlowApproval artifact={artifact} onAction={onAction} />;
  }

  if (artifact.artifact_type === "seo") {
    return <SeoStrategyEditor artifact={artifact} onAction={onAction} />;
  }

  if (artifact.artifact_type === "strategy") {
    return (
      <div className="space-y-3">
        <div>
          <h4 className="font-semibold">{readString(data.title)}</h4>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {readString(data.summary)}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs font-semibold text-muted-foreground">사업 목표</p>
            <p className="mt-1 text-sm">{readString(data.businessGoal)}</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs font-semibold text-muted-foreground">포지셔닝</p>
            <p className="mt-1 text-sm">{readString(data.positioning)}</p>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            전환 목표
          </p>
          <BulletList items={readStringArray(data.conversionGoals)} />
        </div>
      </div>
    );
  }

  if (artifact.artifact_type === "brand") {
    return <BrandStrategyEditor artifact={artifact} onAction={onAction} />;
  }

  if (artifact.artifact_type === "design") {
    return <DesignSystemSelector artifact={artifact} onAction={onAction} />;
  }

  if (artifact.artifact_type === "site_structure") {
    const pages = Array.isArray(data.pages) ? data.pages : [];
    return (
      <div className="space-y-3">
        {pages.map((page, index) => {
          const pageData = isObject(page) ? page : {};
          return (
            <div key={`${readString(pageData.key)}-${index}`} className="rounded-lg border bg-background p-3">
              <p className="font-medium">{readString(pageData.title)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{readString(pageData.purpose)}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {readStringArray(pageData.sections).map((section) => (
                  <span key={section} className="rounded-md bg-muted px-2 py-1 text-xs">
                    {section}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (artifact.artifact_type === "landing_page") {
    return <LandingGenerationAction artifact={artifact} stepStatus={stepStatus} onAction={onAction} />;
  }

  if (artifact.artifact_type === "review") {
    return <ReviewCompletion artifact={artifact} onAction={onAction} generatedSite={generatedSite} />;
  }

  return <JsonPreview data={data} />;
}

function AgentStepCard({
  step,
  artifact,
  stepDef,
  onAction,
  artifacts,
  generatedSite,
}: {
  step?: StepRow;
  artifact?: ArtifactRow;
  stepDef: (typeof WORKFLOW_STEPS)[number];
  onAction: (action: WorkflowAction) => Promise<void>;
  artifacts: Map<string, ArtifactRow>;
  generatedSite?: GeneratedSiteData;
}) {
  const status = step?.status ?? "pending";
  const Icon = stepDef.icon;

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
              status === "completed" && "border-emerald-200 bg-emerald-50 text-emerald-700",
              status === "running" && "border-primary/30 bg-primary/10 text-primary",
              status === "failed" && "border-destructive/30 bg-destructive/10 text-destructive",
              status === "pending" && "bg-muted/40 text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{stepDef.label}</h3>
              <Badge variant={statusBadgeVariant(status)}>{STATUS_LABEL[status]}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{stepDef.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {stepDef.agentName}
              {step?.model ? ` / ${step.model}` : ""}
            </p>
          </div>
        </div>
        <StatusIcon status={status} />
      </div>

      {status === "failed" && step?.error_message && (
        <div className="mt-4 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {step.error_message}
        </div>
      )}

      {status === "completed" && (
        <div className="mt-4 flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          이 단계의 산출물이 승인되어 다음 단계에 반영되었습니다.
        </div>
      )}

      <div className="mt-5">
        <ArtifactRenderer
          artifact={artifact}
          stepStatus={status}
          onAction={onAction}
          artifacts={artifacts}
          generatedSite={generatedSite}
        />
      </div>
    </section>
  );
}

function buildGeneratedContentFromArtifacts(
  artifacts: Map<string, ArtifactRow>,
  config: ProjectConfig
): GeneratedContent | undefined {
  const landing = artifacts.get("landing_page");
  if (!landing || !isObject(landing.data)) return undefined;

  const seo = artifacts.get("seo");
  const review = artifacts.get("review");
  const siteArchitecture = artifacts.get("site_architecture");
  const seoData = seo && isObject(seo.data) ? seo.data : {};
  const reviewData = review && isObject(review.data) ? review.data : {};
  const architectureData = siteArchitecture && isObject(siteArchitecture.data) ? siteArchitecture.data : {};
  const menus = readObjectArray(architectureData.menus);
  const sections = readObjectArray(landing.data.sections);
  const score = typeof reviewData.score === "number" ? reviewData.score : 86;

  return {
    region: {
      title: readString(landing.data.headline),
      body: readString(landing.data.subheadline),
    },
    benchmark: {
      title: "AI 웹사이트 기획 요약",
      body: sections
        .map((section) => `${readString(section.title)}: ${readString(section.body)}`)
        .filter(Boolean)
        .join("\n"),
    },
    seo: {
      title: readString(seoData.title) || `${config.region} ${config.propertyType} SEO 전략`,
      rows: [
        { label: "메타 설명", value: readString(seoData.metaDescription) },
        {
          label: "핵심 키워드",
          value: [...readStringArray(seoData.primaryKeywords), ...readStringArray(seoData.secondaryKeywords)].join(", "),
        },
      ].filter((row) => row.value),
    },
    structure: {
      title: "승인된 사이트 구조",
      pages: menus.length > 0 ? menus.map((menu) => readString(menu.label)) : ["홈", "추천 매물", "상담 문의"],
    },
    report: {
      title: "검토 리포트",
      body: readString(reviewData.summary) || "기획 승인 내용을 바탕으로 랜딩페이지 목업이 생성되었습니다.",
      score,
    },
  };
}

function getGeneratedSiteFromArtifacts(
  artifacts: Map<string, ArtifactRow>,
  config: ProjectConfig,
  projectName: string,
  workflowRunId?: string
): GeneratedSiteData | undefined {
  const landing = artifacts.get("landing_page");
  const landingData = landing && isObject(landing.data) ? landing.data : {};
  if (isGeneratedSiteData(landingData.generatedSite)) return landingData.generatedSite;
  if (landingData.generated !== true) return undefined;
  return buildGeneratedSiteData({ artifacts, config, projectName, workflowRunId });
}

export function MultiAgentWorkflowPanel({
  projectId,
  initialWorkflow,
  config,
  initialContent,
  autoStart = false,
}: {
  projectId: string;
  initialWorkflow: WorkflowSnapshot;
  config: ProjectConfig;
  initialContent?: GeneratedContent;
  autoStart?: boolean;
}) {
  const [workflow, setWorkflow] = useState(initialWorkflow);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  const stepByKey = useMemo(() => {
    return new Map(workflow.steps.map((step) => [step.step_key, step]));
  }, [workflow.steps]);

  const artifactByType = useMemo(() => {
    return new Map(workflow.artifacts.map((artifact) => [artifact.artifact_type, artifact]));
  }, [workflow.artifacts]);

  const completedCount = WORKFLOW_STEPS.filter(
    (step) => stepByKey.get(step.key)?.status === "completed"
  ).length;
  const activeStep = WORKFLOW_STEPS.find((step) => {
    const status = stepByKey.get(step.key)?.status ?? "pending";
    return status === "running" || status === "failed" || status === "pending";
  });
  const isLive = workflow.run?.status === "running" || workflow.run?.status === "queued";
  const landingStepIndex = WORKFLOW_STEPS.findIndex((step) => step.key === "landing_page");
  const preLandingSteps = WORKFLOW_STEPS.slice(0, landingStepIndex);
  const arePlanningStepsCompleted = preLandingSteps.every(
    (step) => stepByKey.get(step.key)?.status === "completed"
  );
  const isLandingCompleted =
    arePlanningStepsCompleted && stepByKey.get("landing_page")?.status === "completed";
  const isWorkflowCompleted = workflow.run?.status === "completed";
  const previewContent = useMemo(() => {
    return initialContent ?? buildGeneratedContentFromArtifacts(artifactByType, config);
  }, [artifactByType, config, initialContent]);
  const generatedSite = useMemo(
    () => getGeneratedSiteFromArtifacts(artifactByType, config, "부동산 웹사이트", workflow.run?.id),
    [artifactByType, config, workflow.run?.id]
  );

  const refreshWorkflow = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/workflow`, { method: "GET" });
    const data: WorkflowApiResult = await res.json();
    if (!data.ok) {
      setError(data.error);
      return;
    }
    setWorkflow(data.workflow);
  }, [projectId]);

  const startMockWorkflow = useCallback(async () => {
    setIsStarting(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/workflow`, { method: "POST" });
      const data: WorkflowApiResult = await res.json();
      if (!data.ok) {
        setError(data.error);
        return;
      }
      setWorkflow(data.workflow);
    } catch {
      setError("워크플로우를 시작하지 못했습니다.");
    } finally {
      setIsStarting(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!autoStart || workflow.run || isStarting) return;
    void startMockWorkflow();
  }, [autoStart, workflow.run, isStarting, startMockWorkflow]);

  async function runWorkflowAction(action: WorkflowAction) {
    setError("");
    const res = await fetch(`/api/projects/${projectId}/workflow`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action),
    });
    const data: WorkflowApiResult = await res.json();
    if (!data.ok) {
      setError(data.error);
      return;
    }
    setWorkflow(data.workflow);
  }

  useEffect(() => {
    if (!isLive) return;
    const id = window.setInterval(() => {
      void refreshWorkflow();
    }, 2500);
    return () => window.clearInterval(id);
  }, [isLive, refreshWorkflow]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">멀티 에이전트 웹사이트 제작 워크플로우</h2>
              {workflow.run ? (
                <Badge variant={workflow.run.status === "completed" ? "default" : "outline"}>
                  {RUN_STATUS_LABEL[workflow.run.status] ?? workflow.run.status}
                </Badge>
              ) : (
                <Badge variant="outline">시작 전</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              실제 AI 호출 없이 저장된 run, step, artifact 데이터로 검증하는 목업 워크플로우입니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={refreshWorkflow} disabled={isStarting} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              새로고침
            </Button>
            <Button onClick={startMockWorkflow} disabled={isStarting || Boolean(workflow.run)} className="gap-1.5">
              {isStarting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              목업 워크플로우 시작
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {isWorkflowCompleted && (
          <div className="mt-4 flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">웹사이트 초안이 준비되었습니다.</p>
              <p className="mt-1 text-sm text-emerald-800/80">
                미리보기 페이지에서 생성된 랜딩페이지를 확인하고 내보내기 준비 상태를 볼 수 있습니다.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-fit rounded-xl border bg-card p-4 shadow-sm lg:sticky lg:top-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">워크플로우 진행률</p>
              <p className="text-xs text-muted-foreground">
                {completedCount}/{WORKFLOW_STEPS.length} 완료
              </p>
            </div>
            <Database className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            {WORKFLOW_STEPS.map((stepDef) => {
              const status = stepByKey.get(stepDef.key)?.status ?? "pending";
              const isActive = activeStep?.key === stepDef.key;
              return (
                <div
                  key={stepDef.key}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm",
                    isActive ? "border-primary/40 bg-primary/5" : "border-transparent bg-muted/20"
                  )}
                >
                  <StatusIcon status={status} />
                  <span className={cn("flex-1 truncate", isActive && "font-medium text-primary")}>
                    {stepDef.label}
                  </span>
                </div>
              );
            })}
          </div>
        </aside>

        <div className="space-y-4">
          {WORKFLOW_STEPS.map((stepDef) => (
            <AgentStepCard
              key={stepDef.key}
              step={stepByKey.get(stepDef.key)}
              artifact={artifactByType.get(stepDef.artifactType)}
              stepDef={stepDef}
              onAction={runWorkflowAction}
              artifacts={artifactByType}
              generatedSite={generatedSite}
            />
          ))}

          {isLandingCompleted ? (
            generatedSite ? (
              <LandingPreviewRenderer site={generatedSite} projectId={projectId} />
            ) : (
              <section className="rounded-xl border bg-card p-5 text-sm text-muted-foreground shadow-sm">
                생성 사이트 데이터를 준비하는 중입니다. 새로고침 후 다시 확인해주세요.
              </section>
            )
          ) : (
            <section className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold">랜딩페이지 미리보기 잠금</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    랜딩페이지는 벤치마크, 전략, 사이트 아키텍처, 기능 기획, UX 흐름, SEO, 브랜드, 디자인 시스템 단계가 완료된 후 생성됩니다.
                  </p>
                </div>
              </div>
            </section>
          )}

          <details className="rounded-xl border border-dashed bg-card p-5 shadow-sm">
            <summary className="cursor-pointer select-none text-sm font-semibold">
              기존 랜딩페이지 생성기 백업 열기
            </summary>
            <div className="mt-4">
              {isLandingCompleted ? (
                <AiGenerationPanel
                  projectId={projectId}
                  config={config}
                  initialContent={previewContent}
                />
              ) : (
                <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm leading-relaxed text-muted-foreground">
                  랜딩페이지는 벤치마크, 전략, 사이트 아키텍처, 기능 기획, UX 흐름, SEO, 브랜드, 디자인 시스템 단계가 완료된 후 생성됩니다.
                </div>
              )}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
