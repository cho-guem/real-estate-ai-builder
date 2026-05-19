import type { Json, Tables } from "./database.types";

export type WorkflowStatus =
  | "queued"
  | "running"
  | "waiting_for_user"
  | "completed"
  | "failed"
  | "canceled";

export type AgentStepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export type AgentArtifactStatus = "draft" | "approved" | "rejected" | "superseded";

export type AgentArtifactType =
  | "benchmark"
  | "strategy"
  | "site_architecture"
  | "feature_planning"
  | "ux_flow"
  | "seo"
  | "design"
  | "brand"
  | "site_structure"
  | "landing_page"
  | "review";

export interface AgentStep {
  id: string;
  runId: string;
  projectId: string;
  stepKey: string;
  agentRole: string;
  status: AgentStepStatus;
  orderIndex: number;
  input: Json;
  output: Json | null;
  errorMessage: string | null;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentArtifact<TData = Json> {
  id: string;
  projectId: string;
  runId: string;
  stepId: string | null;
  artifactType: AgentArtifactType;
  status: AgentArtifactStatus;
  version: number;
  data: TData;
  createdAt: string;
  updatedAt: string;
}

export interface BenchmarkArtifact {
  title: string;
  summary: string;
  candidates?: Array<{
    id: string;
    siteName: string;
    category: string;
    previewTone: string;
    description: string;
    whyUseful?: string;
    strengths: string[];
    weaknesses: string[];
    borrow: string[];
    fitScore: number;
    websiteUrl: string;
  }>;
  selectedCandidateIds?: string[];
  competitors: Array<{
    name: string;
    url?: string;
    strengths: string[];
    weaknesses: string[];
    takeaways: string[];
  }>;
  opportunities: string[];
}

export interface StrategyArtifact {
  title: string;
  summary: string;
  businessGoal: string;
  targetAudience: string;
  positioning: string;
  conversionGoals: string[];
  successMetrics: string[];
}

export interface SiteArchitectureArtifact {
  title: string;
  summary: string;
  approved?: boolean;
  menus?: Array<{
    id: string;
    label: string;
    submenus: string[];
  }>;
  sitemap: Array<{
    key: string;
    title: string;
    role: string;
    priority: string;
  }>;
  navigation: Array<{
    label: string;
    pageKey: string;
  }>;
}

export interface FeaturePlanningArtifact {
  title: string;
  summary: string;
  approved?: boolean;
  coreFeatures: Array<{
    id?: string;
    enabled?: boolean;
    name: string;
    purpose: string;
    priority: string;
  }>;
  futureFeatures: string[];
}

export interface UxFlowArtifact {
  title: string;
  summary: string;
  approved?: boolean;
  notes?: string;
  revisionRequest?: string;
  mobileRecommendations?: string[];
  flows: Array<{
    name: string;
    steps: string[];
    goal: string;
  }>;
  frictionReducers: string[];
}

export interface SeoArtifact {
  approved?: boolean;
  title: string;
  metaDescription: string;
  primaryKeywords: string[];
  secondaryKeywords: string[];
  pageRecommendations: Array<{
    pageKey: string;
    title: string;
    metaDescription: string;
    keywords: string[];
  }>;
}

export interface DesignArtifact {
  approved?: boolean;
  direction: string;
  layoutPrinciples: string[];
  paletteOptions?: Array<{
    id: string;
    name: string;
    description: string;
    colors: string[];
  }>;
  typographyOptions?: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  layoutOptions?: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  selectedPaletteId?: string;
  selectedTypographyId?: string;
  selectedLayoutId?: string;
  colorPalette: Array<{
    name: string;
    value: string;
    usage: string;
  }>;
  typography: {
    heading: string;
    body: string;
  };
  components: string[];
}

export interface BrandArtifact {
  approved?: boolean;
  name: string;
  positioning: string;
  voice: string;
  toneKeywords?: string[];
  audience: string;
  valuePropositions: string[];
  callsToAction: string[];
}

export interface SiteStructureArtifact {
  pages: Array<{
    key: string;
    title: string;
    purpose: string;
    sections: string[];
  }>;
  navigation: Array<{
    label: string;
    pageKey: string;
  }>;
}

export interface LandingPageArtifact {
  generated?: boolean;
  headline: string;
  subheadline: string;
  preview?: {
    propertyCards: Array<{
      title: string;
      meta: string;
      price: string;
      body: string;
    }>;
    propertySectionEyebrow: string;
    propertySectionTitle: string;
    ctaTitle: string;
    mapTitle: string;
    mapDescription: string;
    footerNote: string;
  };
  sections: Array<{
    key: string;
    title: string;
    body: string;
    cta?: string;
  }>;
  leadForm: {
    title: string;
    fields: string[];
    submitLabel: string;
  };
}

export interface ReviewArtifact {
  approved?: boolean;
  score: number;
  summary: string;
  checklist?: Array<{
    label: string;
    passed: boolean;
  }>;
  issues?: string[];
  passedChecks: string[];
  warnings: string[];
  requiredFixes: string[];
}

export interface WorkflowSnapshot {
  run: Tables<"generation_runs"> | null;
  steps: Tables<"generation_steps">[];
  artifacts: Tables<"website_artifacts">[];
}
