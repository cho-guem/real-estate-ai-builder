export const appConfig = {
  name: "AI 부동산 빌더",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  description: "AI 기반 부동산 웹사이트 빌더",
  nav: {
    dashboard: [
      { label: "대시보드", href: "/dashboard", icon: "LayoutDashboard" },
      { label: "프로젝트", href: "/projects", icon: "FolderOpen" },
      { label: "설정", href: "/settings", icon: "Settings" },
    ],
  },
  ai: {
    model: "claude-sonnet-4-6" as const,
    maxTokens: 4096,
  },
} as const;
