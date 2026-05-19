import type { ProjectConfig } from "@/config/project-options";
import type { Json } from "@/types/database.types";
import type { AgentArtifactType } from "@/types/workflow.types";

export type IndustryPresetId = "real_estate" | "manufacturing" | "clinic" | "academy";

export interface IndustryWorkflowStepCopy {
  label: string;
  agentName: string;
  description: string;
}

export type IndustryWorkflowStepCopyMap = Record<string, IndustryWorkflowStepCopy>;

export interface IndustryPreset {
  id: IndustryPresetId;
  name: string;
  description: string;
  isImplemented: boolean;
  workflowSteps: IndustryWorkflowStepCopyMap;
  buildArtifact: (
    artifactType: AgentArtifactType,
    config: ProjectConfig,
    projectName: string
  ) => Json;
}
