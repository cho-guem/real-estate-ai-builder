import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { mapGeneratedSiteToElementor } from "../src/lib/elementor-export";
import { createZip, type ZipFileInput } from "../src/lib/zip";
import type { GeneratedSiteData } from "../src/types/generated-site.types";

async function readDirectoryAsZipFiles(rootDir: string, zipRoot: string): Promise<ZipFileInput[]> {
  const files: ZipFileInput[] = [];
  const entries = await readdir(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    const relativePath = path.posix.join(zipRoot, entry.name).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      files.push(...await readDirectoryAsZipFiles(fullPath, relativePath));
      continue;
    }

    if (entry.isFile()) {
      files.push({
        path: relativePath,
        data: await readFile(fullPath),
      });
    }
  }

  return files;
}

const generatedSite: GeneratedSiteData = {
  version: 1,
  industryPreset: "real_estate",
  generatedAt: new Date().toISOString(),
  source: { projectName: "AI 부동산 홈페이지" },
  navigation: [
    { label: "홈", href: "#hero" },
    { label: "추천 매물", href: "#properties" },
    { label: "매물 검색", href: "#property_search_list" },
    { label: "입지 검토", href: "#location_map_review" },
    { label: "상담 문의", href: "#inquiry" },
  ],
  colors: {
    primary: "#172033",
    accent: "#f97316",
    surface: "#f8fafc",
    text: "#0f172a",
  },
  typography: {
    styleId: "professional-sans",
    heading: "전문 산세리프",
    body: "읽기 쉬운 본문",
  },
  layout: {
    styleId: "conversion-landing",
    name: "상담 전환형",
    showMap: true,
    showPropertyCards: true,
    showInquiryForm: true,
  },
  cta: {
    primaryLabel: "상담 요청하기",
    secondaryLabel: "추천 매물 보기",
    headline: "조건을 남기면 맞춤 매물을 선별해드립니다",
    body: "지역과 조건을 알려주시면 적합한 매물을 빠르게 정리해드립니다.",
  },
  sections: [
    {
      id: "hero",
      type: "hero",
      title: "조건에 맞는 부동산 매물을 빠르게 찾으세요",
      body: "지역 전문성과 실제 매물 정보를 바탕으로 검색, 지도 검토, 상담 문의까지 한 번에 연결합니다.",
      ctaLabel: "상담 요청하기",
    },
    { id: "trust", type: "trust", title: "신뢰 근거", body: "지역 시장을 이해하는 전문 상담 흐름" },
    { id: "properties", type: "properties", title: "추천 매물", body: "대표 매물 카드" },
    { id: "search", type: "properties", title: "매물 검색 및 목록", body: "검색 폼과 매물 목록" },
    { id: "map", type: "map", title: "지도 기반 입지 검토", body: "좌표와 지역 필터를 기반으로 입지를 검토합니다." },
    { id: "cta", type: "cta", title: "맞춤 상담을 받아보세요", body: "조건을 남기면 담당자가 빠르게 연락드립니다.", ctaLabel: "문의하기" },
    { id: "footer", type: "footer", title: "AI 부동산 홈페이지", body: "WordPress 자동 생성 패키지" },
  ],
  trustItems: [
    "지역별 시세와 수요 흐름을 반영한 상담",
    "조건에 맞는 추천 매물 선별",
    "문의 후 빠른 응대와 후속 안내",
  ],
  cards: [
    { title: "산업단지 인근 공장", meta: "매매 / 진입도로 우수", price: "조건 협의", body: "전력, 층고, 주차 조건을 상담 전 확인할 수 있습니다." },
    { title: "물류 이동이 편한 창고", meta: "임대 / 대로변 접근", price: "월세 협의", body: "차량 진입과 하역 동선이 좋은 추천 매물입니다." },
    { title: "개발 가능성 있는 토지", meta: "매매 / 용도 검토", price: "상담 문의", body: "입지와 개발 가능성을 함께 검토합니다." },
  ],
  form: {
    title: "조건에 맞는 매물 문의",
    fields: ["이름", "연락처", "희망 지역", "예산", "필요 면적"],
    submitLabel: "문의 보내기",
  },
  footer: {
    brandName: "AI 부동산 홈페이지",
    description: "부동산 매물 검색, 지도 검토, 상담 전환을 위한 WordPress 템플릿입니다.",
    note: "Elementor Container 기반 템플릿",
  },
  seo: {
    title: "부동산 매물 검색 및 상담",
    metaDescription: "지역 기반 부동산 매물 검색과 상담을 위한 AI 생성 홈페이지입니다.",
    keywords: ["부동산", "매물 검색", "상담 문의"],
  },
  exports: {
    componentTree: { type: "GeneratedLandingPage", props: { preset: "real_estate" }, children: [] },
    staticPageData: {},
    structuredPrompt: "",
  },
};

function buildReadme() {
  return `# WordPress 사이트 패키지 설치 안내

## 구성 파일

- elementor-template.json: Elementor Container 기반 랜딩페이지 템플릿
- ai-real-estate-property-manager.zip: 매물 관리, 검색, 목록, 지도 placeholder 플러그인
- README.md: 설치 안내

## 업로드 순서

1. WordPress 관리자에 로그인합니다.
2. 플러그인 > 새로 추가 > 플러그인 업로드에서 ai-real-estate-property-manager.zip을 업로드하고 활성화합니다.
3. 매물 관리 > 초기 설정에서 자동 생성 페이지와 샘플 매물을 확인합니다.
4. Elementor > Templates > Import Templates에서 elementor-template.json을 가져옵니다.
5. 새 페이지를 만들고 가져온 템플릿을 적용합니다.
6. Elementor 페이지 안의 쇼트코드 순서가 아래와 같은지 확인합니다.

\`\`\`text
[property_search]
[property_list]
[property_location_search]
[property_map]
\`\`\`

## 쇼트코드 역할

- [property_search]: 검색 폼만 출력
- [property_list]: 매물 카드 목록만 출력
- [property_location_search]: 지역 검색 폼만 출력
- [property_map]: 지도 placeholder와 좌표 목록 출력

## Elementor 구조

템플릿은 최신 Elementor에서 편집하기 쉬운 Container 기반 구조입니다.
섹션 순서는 Hero, Trust Points, Recommended Property Cards, Property Search & List, Location Map Review, Consultation CTA/Form, Footer입니다.
`;
}

async function main() {
  const root = process.cwd();
  const packageDir = path.join(root, "wordpress-site-package");
  await mkdir(packageDir, { recursive: true });

  const elementorTemplate = JSON.stringify(mapGeneratedSiteToElementor(generatedSite), null, 2);
  const pluginFiles = await readDirectoryAsZipFiles(
    path.join(root, "ai-real-estate-property-manager"),
    "ai-real-estate-property-manager"
  );
  const pluginZip = createZip(pluginFiles);
  const readme = buildReadme();

  await writeFile(path.join(root, "elementor-template-fixed.json"), elementorTemplate, "utf8");
  await writeFile(path.join(root, "ai-real-estate-property-manager-fixed.zip"), pluginZip);
  await writeFile(path.join(packageDir, "elementor-template.json"), elementorTemplate, "utf8");
  await writeFile(path.join(packageDir, "ai-real-estate-property-manager.zip"), pluginZip);
  await writeFile(path.join(packageDir, "README.md"), readme, "utf8");

  const packageZip = createZip([
    { path: "wordpress-site-package/elementor-template.json", data: elementorTemplate },
    { path: "wordpress-site-package/ai-real-estate-property-manager.zip", data: pluginZip },
    { path: "wordpress-site-package/README.md", data: readme },
  ]);
  await writeFile(path.join(root, "wordpress-site-package-fixed.zip"), packageZip);

  const pluginEntryPaths = pluginFiles.map((file) => file.path);
  console.log("Created elementor-template-fixed.json");
  console.log("Created ai-real-estate-property-manager-fixed.zip");
  console.log("Created wordpress-site-package-fixed.zip");
  console.log("Plugin main file exists:", pluginEntryPaths.includes("ai-real-estate-property-manager/ai-real-estate-property-manager.php"));
  console.log("Plugin ZIP root:", pluginEntryPaths[0]?.split("/")[0]);
  console.log("All plugin ZIP paths use forward slash:", pluginEntryPaths.every((item) => !item.includes("\\")));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
