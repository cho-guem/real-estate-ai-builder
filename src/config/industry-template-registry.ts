import { WORKFLOW_STEPS } from "@/config/workflow-steps";
import type { ProjectConfig } from "@/config/project-options";
import type { Json } from "@/types/database.types";
import type { AgentArtifactType } from "@/types/workflow.types";
import { getIndustryPreset } from "@/presets";

export type IndustryTemplateId = "real_estate";

export type IndustryTemplate = {
  id: IndustryTemplateId;
  industry: IndustryTemplateId;
  name: string;
  description: string;
  deployment: {
    provider: "wp_cli";
    pluginSlug: string;
    pluginZipPath: string;
    elementorTemplatePath: string;
    shortcodes: string[];
  };
  buildArtifact: (artifactType: AgentArtifactType, config: ProjectConfig, projectName: string) => Json;
  buildInitialSeo: (config: ProjectConfig, projectName: string) => {
    title: string;
    description: string;
    keywords: string[];
  };
  buildSiteStructure: (config: ProjectConfig) => {
    pages: string[];
    navigation: string[];
  };
};

const realEstatePreset = getIndustryPreset("real_estate");

// Industry templates are the bridge between the generic workflow/deployment
// engine and industry-specific assets. Future industries can register their own
// plugin package, Elementor template, SEO defaults, and artifact builder here.
export const industryTemplateRegistry: Record<IndustryTemplateId, IndustryTemplate> = {
  real_estate: {
    id: "real_estate",
    industry: "real_estate",
    name: "부동산 웹사이트 템플릿",
    description: "부동산 랜딩페이지, 매물 관리 플러그인, Elementor 템플릿을 포함한 기본 템플릿입니다.",
    deployment: {
      provider: "wp_cli",
      pluginSlug: "ai-real-estate-property-manager",
      pluginZipPath: "ai-real-estate-property-manager-wizard.zip",
      elementorTemplatePath: "elementor-template.json",
      shortcodes: ["[property_search]", "[property_list]", "[property_location_search]", "[property_map]"],
    },
    buildArtifact: realEstatePreset.buildArtifact,
    buildInitialSeo: (config, projectName) => ({
      title: `${config.region} ${config.propertyType} ${config.transactionType} 전문 상담 | ${projectName}`,
      description: `${config.region} ${config.propertyType} ${config.transactionType} 고객을 위한 추천 매물, 지역 분석, 빠른 상담 웹사이트입니다.`,
      keywords: [
        `${config.region} 부동산`,
        `${config.region} ${config.propertyType}`,
        `${config.propertyType} ${config.transactionType}`,
        "매물 상담",
      ],
    }),
    buildSiteStructure: () => ({
      pages: ["홈", "추천 매물", "지역 분석", "상담 문의"],
      navigation: ["홈", "추천 매물", "지역 분석", "상담 문의"],
    }),
  },
};

export function getIndustryTemplate(id: string | undefined | null): IndustryTemplate {
  if (id === "real_estate") return industryTemplateRegistry.real_estate;
  return industryTemplateRegistry.real_estate;
}

export const INDUSTRY_TEMPLATE_WORKFLOW_STEPS = WORKFLOW_STEPS;
