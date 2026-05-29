export interface GeneratedSiteNavigationItem {
  label: string;
  href: string;
}

export interface GeneratedSiteColors {
  primary: string;
  accent: string;
  surface: string;
  text: string;
}

export interface GeneratedSiteTypography {
  styleId: string;
  heading: string;
  body: string;
}

export interface GeneratedSiteLayout {
  styleId: string;
  name: string;
  showMap: boolean;
  showPropertyCards: boolean;
  showInquiryForm: boolean;
}

export interface GeneratedSiteCta {
  primaryLabel: string;
  secondaryLabel: string;
  headline: string;
  body: string;
}

export interface GeneratedSiteAssets {
  heroImage?: string;
  logo?: string;
  brandImage?: string;
}

export interface GeneratedSiteSection {
  id: string;
  type: "hero" | "trust" | "properties" | "cta" | "map" | "inquiry" | "footer";
  title: string;
  body?: string;
  ctaLabel?: string;
}

export interface GeneratedSiteCard {
  title: string;
  meta: string;
  price: string;
  body: string;
}

export interface GeneratedSiteForm {
  title: string;
  fields: string[];
  submitLabel: string;
}

export interface GeneratedSiteFooter {
  brandName: string;
  description: string;
  note: string;
}

export interface GeneratedSiteComponentNode {
  type: string;
  props: Record<string, string | number | boolean | string[]>;
  children?: GeneratedSiteComponentNode[];
}

export interface GeneratedSiteData {
  version: 1;
  industryPreset: "real_estate";
  generatedAt: string;
  source: {
    projectName: string;
    workflowRunId?: string;
  };
  navigation: GeneratedSiteNavigationItem[];
  colors: GeneratedSiteColors;
  typography: GeneratedSiteTypography;
  layout: GeneratedSiteLayout;
  cta: GeneratedSiteCta;
  assets?: GeneratedSiteAssets;
  sections: GeneratedSiteSection[];
  trustItems: string[];
  cards: GeneratedSiteCard[];
  form: GeneratedSiteForm;
  footer: GeneratedSiteFooter;
  seo: {
    title: string;
    metaDescription: string;
    keywords: string[];
  };
  exports: {
    componentTree: GeneratedSiteComponentNode;
    staticPageData: Record<string, unknown>;
    structuredPrompt: string;
  };
}
