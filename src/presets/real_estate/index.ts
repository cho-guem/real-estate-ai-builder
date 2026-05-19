import { buildRealEstateArtifact } from "@/presets/real_estate/artifacts";
import { realEstateWorkflowSteps } from "@/presets/real_estate/workflow-copy";
import type { IndustryPreset } from "@/presets/types";

export const realEstatePreset: IndustryPreset = {
  id: "real_estate",
  name: "부동산 웹사이트",
  description: "공장, 창고, 상업용 부동산 중심의 MVP 기본 프리셋입니다.",
  isImplemented: true,
  workflowSteps: realEstateWorkflowSteps,
  buildArtifact: buildRealEstateArtifact,
};
