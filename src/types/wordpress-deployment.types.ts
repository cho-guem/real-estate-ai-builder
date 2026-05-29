import type { Tables } from "./database.types";

export type WordPressDeploymentStatus = Tables<"wordpress_deployments">["status"];
export type WordPressDeploymentStepStatus = Tables<"wordpress_deployment_steps">["status"];

export type WordPressDeploymentProvider = "docker" | "wp_cli" | "managed_host" | "mock";
export type DeploymentMode = "managed_hosting" | "existing_hosting";

export type WordPressDeploymentStepKey =
  | "create_wordpress"
  | "create_admin"
  | "upload_plugin_zip"
  | "install_plugin"
  | "activate_plugin"
  | "run_setup_wizard"
  | "import_elementor"
  | "connect_domain";

export type WordPressDeploymentRequest = {
  projectId: string;
  userId: string;
  provider?: WordPressDeploymentProvider;
  domain?: string;
  adminEmail: string;
  adminUsername?: string;
  businessType?: string;
  companyName?: string;
  mainColor?: string;
  region?: string;
  deploymentConfirmed?: boolean;
  deploymentMode?: DeploymentMode;
};

export type WordPressProvisioningPlan = {
  siteName: string;
  domain?: string;
  adminEmail: string;
  adminUsername: string;
  deploymentMode: DeploymentMode;
  pluginZipPath: string;
  elementorTemplatePath?: string;
  seo?: {
    title: string;
    description: string;
    keywords: string[];
  };
  siteStructure?: {
    pages: string[];
    navigation: string[];
  };
  setup: {
    businessType: string;
    companyName: string;
    mainColor: string;
    region: string;
  };
};

export type WordPressDeploymentSnapshot = {
  site: Tables<"wordpress_sites"> | null;
  deployment: Tables<"wordpress_deployments"> | null;
  steps: Tables<"wordpress_deployment_steps">[];
};

export const WORDPRESS_DEPLOYMENT_STEPS: Array<{
  key: WordPressDeploymentStepKey;
  label: string;
}> = [
  { key: "create_wordpress", label: "홈페이지 자동 생성" },
  { key: "create_admin", label: "관리자 계정 생성" },
  { key: "upload_plugin_zip", label: "기능 파일 준비" },
  { key: "install_plugin", label: "홈페이지 기능 설치" },
  { key: "activate_plugin", label: "홈페이지 기능 켜기" },
  { key: "run_setup_wizard", label: "기본 설정 자동 적용" },
  { key: "import_elementor", label: "디자인 템플릿 적용" },
  { key: "connect_domain", label: "도메인 연결" },
];
