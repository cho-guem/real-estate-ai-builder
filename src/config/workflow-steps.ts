import {
  BarChart3,
  Brush,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  Flag,
  GitBranch,
  Megaphone,
  Palette,
  Route,
  SearchCode,
} from "lucide-react";
import type React from "react";
import { defaultIndustryPreset } from "@/presets";
import type { AgentArtifactType } from "@/types/workflow.types";

export type WorkflowStepKey =
  | "benchmark"
  | "strategy"
  | "site_architecture"
  | "feature_planning"
  | "ux_flow"
  | "seo"
  | "brand"
  | "design"
  | "landing_page"
  | "review";

const WORKFLOW_STEP_DEFINITIONS: Array<{
  key: WorkflowStepKey;
  artifactType: AgentArtifactType;
  icon: React.ElementType;
}> = [
  {
    key: "benchmark",
    artifactType: "benchmark",
    icon: BarChart3,
  },
  {
    key: "strategy",
    artifactType: "strategy",
    icon: Flag,
  },
  {
    key: "site_architecture",
    artifactType: "site_architecture",
    icon: GitBranch,
  },
  {
    key: "feature_planning",
    artifactType: "feature_planning",
    icon: ClipboardList,
  },
  {
    key: "ux_flow",
    artifactType: "ux_flow",
    icon: Route,
  },
  {
    key: "seo",
    artifactType: "seo",
    icon: SearchCode,
  },
  {
    key: "brand",
    artifactType: "brand",
    icon: Megaphone,
  },
  {
    key: "design",
    artifactType: "design",
    icon: Palette,
  },
  {
    key: "landing_page",
    artifactType: "landing_page",
    icon: Brush,
  },
  {
    key: "review",
    artifactType: "review",
    icon: FileSearch,
  },
];

// The workflow engine owns durable step keys, artifact types, ordering, and icons.
// Industry presets provide user-facing labels/copy so future industries can plug in
// without changing run/step persistence or routing logic.
export const WORKFLOW_STEPS = WORKFLOW_STEP_DEFINITIONS.map((step) => ({
  ...step,
  ...defaultIndustryPreset.workflowSteps[step.key],
}));

export const FALLBACK_STEP_ICON = CheckCircle2;
