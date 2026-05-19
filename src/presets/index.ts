import { realEstatePreset } from "@/presets/real_estate";
import type { IndustryPreset, IndustryPresetId } from "@/presets/types";

const futurePreset = (id: Exclude<IndustryPresetId, "real_estate">, name: string): IndustryPreset => ({
  id,
  name,
  description: "향후 확장을 위한 자리표시자입니다. 현재 MVP에서는 부동산 프리셋만 활성화합니다.",
  isImplemented: false,
  workflowSteps: realEstatePreset.workflowSteps,
  buildArtifact: realEstatePreset.buildArtifact,
});

export const DEFAULT_INDUSTRY_PRESET_ID: IndustryPresetId = "real_estate";

export const INDUSTRY_PRESETS: Record<IndustryPresetId, IndustryPreset> = {
  real_estate: realEstatePreset,
  manufacturing: futurePreset("manufacturing", "제조업 웹사이트"),
  clinic: futurePreset("clinic", "병원/클리닉 웹사이트"),
  academy: futurePreset("academy", "학원/교육 웹사이트"),
};

export function getIndustryPreset(id: IndustryPresetId = DEFAULT_INDUSTRY_PRESET_ID): IndustryPreset {
  const preset = INDUSTRY_PRESETS[id];
  return preset.isImplemented ? preset : INDUSTRY_PRESETS[DEFAULT_INDUSTRY_PRESET_ID];
}

// Future presets plug in by adding a folder under src/presets/<industry>
// that exports workflow copy and artifact builders, then replacing the
// placeholder entry above. The workflow engine can keep using step keys.
export const defaultIndustryPreset = getIndustryPreset();
