import type { ProjectConfig } from "@/config/project-options";
import type { Json, Tables } from "@/types/database.types";
import type {
  GeneratedSiteCard,
  GeneratedSiteComponentNode,
  GeneratedSiteData,
  GeneratedSiteSection,
} from "@/types/generated-site.types";

type ArtifactLike = Pick<Tables<"website_artifacts">, "artifact_type" | "data">;

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

function getArtifactData(
  artifacts: ArtifactLike[] | Map<string, ArtifactLike>,
  artifactType: string
): Record<string, Json | undefined> {
  const artifact = Array.isArray(artifacts)
    ? artifacts.find((item) => item.artifact_type === artifactType)
    : artifacts.get(artifactType);
  return artifact && isObject(artifact.data) ? artifact.data : {};
}

function getSelectedOption(
  options: Array<Record<string, Json | undefined>>,
  selectedId: string
) {
  return options.find((option) => readString(option.id) === selectedId) ?? options[0] ?? {};
}

function hasFeature(features: Array<Record<string, Json | undefined>>, patterns: string[]) {
  return features.some((feature) => {
    const id = readString(feature.id);
    const name = readString(feature.name);
    return patterns.some((pattern) => id.includes(pattern) || name.includes(pattern));
  });
}

function buildComponentTree(sections: GeneratedSiteSection[]): GeneratedSiteComponentNode {
  return {
    type: "GeneratedLandingPage",
    props: { preset: "real_estate" },
    children: sections.map((section) => ({
      type: `${section.type[0].toUpperCase()}${section.type.slice(1)}Section`,
      props: {
        id: section.id,
        title: section.title,
        body: section.body ?? "",
        ctaLabel: section.ctaLabel ?? "",
      },
    })),
  };
}

export function isGeneratedSiteData(value: unknown): value is GeneratedSiteData {
  return Boolean(
    value &&
      typeof value === "object" &&
      "version" in value &&
      "sections" in value &&
      "navigation" in value
  );
}

export function buildGeneratedSiteData({
  artifacts,
  config,
  projectName,
  workflowRunId,
}: {
  artifacts: ArtifactLike[] | Map<string, ArtifactLike>;
  config: ProjectConfig;
  projectName: string;
  workflowRunId?: string;
}): GeneratedSiteData {
  const landing = getArtifactData(artifacts, "landing_page");
  const benchmark = getArtifactData(artifacts, "benchmark");
  const strategy = getArtifactData(artifacts, "strategy");
  const architecture = getArtifactData(artifacts, "site_architecture");
  const seo = getArtifactData(artifacts, "seo");
  const brand = getArtifactData(artifacts, "brand");
  const design = getArtifactData(artifacts, "design");
  const featureData = getArtifactData(artifacts, "feature_planning");
  const preview = isObject(landing.preview) ? landing.preview : {};
  const leadForm = isObject(landing.leadForm) ? landing.leadForm : {};
  const features = readObjectArray(featureData.coreFeatures).filter((feature) => feature.enabled === true);
  const paletteOptions = readObjectArray(design.paletteOptions);
  const typographyOptions = readObjectArray(design.typographyOptions);
  const layoutOptions = readObjectArray(design.layoutOptions);
  const selectedPalette = getSelectedOption(paletteOptions, readString(design.selectedPaletteId));
  const selectedTypography = getSelectedOption(typographyOptions, readString(design.selectedTypographyId));
  const selectedLayout = getSelectedOption(layoutOptions, readString(design.selectedLayoutId));
  const colors = readStringArray(selectedPalette.colors);
  const sections = readObjectArray(landing.sections);
  const selectedCandidates = readObjectArray(benchmark.selectedCandidates);
  const navigation = readObjectArray(architecture.menus);
  const propertyCards = readObjectArray(preview.propertyCards);
  const generatedCards: GeneratedSiteCard[] = (
    propertyCards.length > 0
      ? propertyCards
      : [
          {
            title: `${config.region} ${config.propertyType} 추천 매물`,
            meta: `${config.transactionType} / 역세권 접근 우수`,
            price: "조건 협의",
            body: "면적, 진입로, 주차, 업종 적합성을 상담 전 빠르게 확인할 수 있는 대표 매물입니다.",
          },
        ]
  ).map((card) => ({
    title: readString(card.title),
    meta: readString(card.meta),
    price: readString(card.price),
    body: readString(card.body),
  }));

  const showMap = hasFeature(features, ["map", "region", "지도", "지역"]);
  const showPropertyCards = hasFeature(features, ["listing", "recommend", "compare", "favorite", "매물", "추천", "비교", "관심"]);
  const showInquiryForm = hasFeature(features, ["inquiry", "문의", "상담"]);
  const siteSections: GeneratedSiteSection[] = [
    {
      id: "hero",
      type: "hero",
      title: readString(landing.headline),
      body: readString(landing.subheadline) || readString(brand.positioning),
      ctaLabel: readString(sections[0]?.cta) || "상담 요청하기",
    },
    {
      id: "trust",
      type: "trust",
      title: "신뢰 근거",
      body: readString(strategy.positioning),
    },
    ...(showPropertyCards
      ? [
          {
            id: "properties",
            type: "properties" as const,
            title: readString(preview.propertySectionTitle) || "조건에 맞는 매물을 빠르게 비교하세요",
            body: readString(preview.propertySectionEyebrow) || "추천 매물",
          },
        ]
      : []),
    {
      id: "cta",
      type: "cta",
      title: readString(preview.ctaTitle) || "조건을 남기면 맞춤 매물을 선별해드립니다",
      body: readString(strategy.businessGoal),
      ctaLabel: "지금 상담 요청",
    },
    ...(showInquiryForm
      ? [
          {
            id: "inquiry",
            type: "inquiry" as const,
            title: readString(leadForm.title) || "조건에 맞는 매물 문의",
          },
        ]
      : []),
    ...(showMap
      ? [
          {
            id: "map",
            type: "map" as const,
            title: readString(preview.mapTitle) || "지도 기반 입지 검토",
            body: readString(preview.mapDescription) || `${config.region} 주요 입지와 매물 밀집 구역을 보여줍니다.`,
          },
        ]
      : []),
    {
      id: "footer",
      type: "footer",
      title: readString(brand.name) || `${config.region} 전문 부동산`,
      body: readString(preview.footerNote) || "목업 프리뷰 / 실제 AI 연결 전 검증용",
    },
  ];

  const keywords = [
    ...readStringArray(seo.primaryKeywords),
    ...readStringArray(seo.secondaryKeywords),
  ];
  const staticPageData = {
    route: "/",
    preset: "real_estate",
    title: readString(seo.title),
    sections: siteSections,
    cards: generatedCards,
  };

  return {
    version: 1,
    industryPreset: "real_estate",
    generatedAt: new Date().toISOString(),
    source: { projectName, workflowRunId },
    navigation: (navigation.length > 0 ? navigation : [{ label: "홈" }, { label: "추천 매물" }, { label: "상담 문의" }]).map((item) => ({
      label: readString(item.label),
      href: `#${readString(item.id) || readString(item.label) || "section"}`,
    })),
    colors: {
      primary: colors[0] || "#172033",
      accent: colors[1] || "#f97316",
      surface: colors[2] || "#f8fafc",
      text: "#0f172a",
    },
    typography: {
      styleId: readString(selectedTypography.id) || "professional-sans",
      heading: readString(selectedTypography.name) || "전문 산세리프",
      body: readString(selectedTypography.description) || "읽기 쉬운 본문",
    },
    layout: {
      styleId: readString(selectedLayout.id) || "conversion-landing",
      name: readString(selectedLayout.name) || "상담 전환형",
      showMap,
      showPropertyCards,
      showInquiryForm,
    },
    cta: {
      primaryLabel: readString(sections[0]?.cta) || "상담 요청하기",
      secondaryLabel: "추천 매물 보기",
      headline: readString(preview.ctaTitle) || "조건을 남기면 맞춤 매물을 선별해드립니다",
      body: readString(strategy.businessGoal),
    },
    assets: {
      heroImage: readString(design.heroImageAsset) || undefined,
      logo: readString(design.logoAsset) || undefined,
      brandImage: readString(design.brandImageAsset) || undefined,
    },
    sections: siteSections,
    trustItems: [
      readString(strategy.positioning),
      ...readStringArray(brand.valuePropositions),
      ...selectedCandidates.slice(0, 2).map((candidate) => `${readString(candidate.siteName)} 참고: ${readString(candidate.whyUseful)}`),
    ].filter(Boolean),
    cards: generatedCards,
    form: {
      title: readString(leadForm.title) || "조건에 맞는 매물 문의",
      fields: readStringArray(leadForm.fields),
      submitLabel: readString(leadForm.submitLabel) || "문의 보내기",
    },
    footer: {
      brandName: readString(brand.name) || `${config.region} 전문 부동산`,
      description: readString(seo.metaDescription),
      note: readString(preview.footerNote) || "목업 프리뷰 / 실제 AI 연결 전 검증용",
    },
    seo: {
      title: readString(seo.title) || `${config.region} ${config.propertyType}`,
      metaDescription: readString(seo.metaDescription),
      keywords,
    },
    exports: {
      componentTree: buildComponentTree(siteSections),
      staticPageData,
      structuredPrompt: [
        "다음 GeneratedSiteData를 기준으로 정적 랜딩페이지를 구현하세요.",
        `브랜드: ${readString(brand.name)}`,
        `SEO 제목: ${readString(seo.title)}`,
        `레이아웃: ${readString(selectedLayout.name)}`,
        `섹션: ${siteSections.map((section) => section.title).join(", ")}`,
      ].join("\n"),
    },
  };
}

export function renderGeneratedSiteHtml(site: GeneratedSiteData): string {
  const sectionHtml = site.sections
    .map((section) => `<section id="${section.id}"><h2>${section.title}</h2><p>${section.body ?? ""}</p></section>`)
    .join("\n");
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${site.seo.title}</title>
  <meta name="description" content="${site.seo.metaDescription}" />
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; color: ${site.colors.text}; background: ${site.colors.surface}; }
    header, footer, section { padding: 32px; }
    header, footer { background: ${site.colors.primary}; color: white; }
    a, button { background: ${site.colors.accent}; color: white; border: 0; border-radius: 8px; padding: 10px 14px; }
    .cards { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
  </style>
</head>
<body>
  <header><h1>${site.sections[0]?.title ?? site.seo.title}</h1><p>${site.sections[0]?.body ?? ""}</p></header>
  ${sectionHtml}
  <footer><strong>${site.footer.brandName}</strong><p>${site.footer.note}</p></footer>
</body>
</html>`;
}
