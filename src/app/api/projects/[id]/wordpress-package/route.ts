import { Buffer } from "node:buffer";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ProjectService } from "@/services/project.service";
import { GenerationWorkflowService } from "@/services/generation-workflow.service";
import { buildGeneratedSiteData, isGeneratedSiteData } from "@/lib/generated-site";
import { mapGeneratedSiteToElementor } from "@/lib/elementor-export";
import { createZip, type ZipFileInput } from "@/lib/zip";
import { WORKFLOW_STEPS } from "@/config/workflow-steps";
import type { ProjectConfig } from "@/config/project-options";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function readDirectoryAsZipFiles(rootDir: string, zipRoot: string): Promise<ZipFileInput[]> {
  const files: ZipFileInput[] = [];
  const entries = await readdir(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    const relativePath = path.posix.join(zipRoot, entry.name);

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

function buildPackageReadme(projectName: string) {
  return `# ${projectName} WordPress 설치 패키지

이 패키지는 AI 부동산 빌더에서 생성한 WordPress 설치용 파일입니다.

## 구성 파일

1. elementor-template.json
   - Elementor에서 가져올 랜딩페이지 템플릿입니다.
   - Hero, 신뢰 포인트, 추천 매물, 지역 분석, 문의 CTA 섹션을 포함합니다.
   - 매물 검색/목록/지도 영역에는 WordPress 쇼트코드 위젯이 삽입되어 있습니다.

2. ai-real-estate-property-manager.zip
   - WordPress 기능 플러그인입니다.
   - property CPT, 매물 입력 메타박스, 매물 검색, 매물 목록, 상세 페이지, 지역 필터, 지도 placeholder를 제공합니다.

3. README.md
   - 현재 설치 안내 파일입니다.

## 설치 순서

1. WordPress 관리자에 로그인합니다.
2. 플러그인 > 새로 추가 > 플러그인 업로드로 이동합니다.
3. ai-real-estate-property-manager.zip 파일을 업로드하고 활성화합니다.
4. 매물 관리 > 새 매물 추가에서 매물 정보를 입력합니다.
5. Elementor > Templates 또는 페이지 편집 화면에서 elementor-template.json 파일을 가져옵니다.
6. 가져온 템플릿을 페이지에 적용합니다.
7. Elementor 페이지에서 쇼트코드 위젯이 아래 쇼트코드를 포함하는지 확인합니다.

## 쇼트코드

- [property_search]
  - 지역, 거래유형, 매물유형, 가격, 면적 필터와 매물 목록을 함께 표시합니다.

- [property_list]
  - 매물 카드 목록만 표시합니다.

- [property_location_search]
  - 도·광역시, 시, 구·군, 읍·면·동 기준 지역 검색과 매물 목록을 표시합니다.

- [property_map]
  - 지도 영역 placeholder와 좌표가 입력된 매물 목록을 표시합니다.

## 지도 API 설정 방법

기본 플러그인은 지도 API 키를 요구하지 않습니다. [property_map]은 지도 연결 전 placeholder와 좌표 목록을 출력합니다.

실제 지도를 표시하려면 아래 중 하나를 선택해 테마 또는 별도 지도 플러그인에서 API 스크립트를 연결하세요.

1. Google Maps
   - Google Cloud Console에서 Maps JavaScript API를 활성화합니다.
   - API 키를 발급하고 도메인 제한을 설정합니다.
   - latitude, longitude post meta 값을 marker 데이터로 연결합니다.

2. Kakao Maps
   - Kakao Developers에서 JavaScript 키를 발급합니다.
   - 사이트 도메인을 등록합니다.
   - latitude, longitude 값을 Kakao Maps marker로 렌더링합니다.

3. Naver Maps
   - Naver Cloud Platform에서 Maps API를 활성화합니다.
   - Client ID를 발급하고 서비스 URL을 등록합니다.
   - latitude, longitude 값을 Naver Maps marker로 렌더링합니다.

## 권장 확인 사항

- WordPress 고유주소 설정에서 변경사항 저장을 눌러 rewrite rule을 갱신하세요.
- 매물 상세 페이지가 열리는지 확인하세요.
- Elementor 템플릿 import 후 쇼트코드 영역이 정상 출력되는지 확인하세요.
- 실제 운영 전 지도 API 키의 도메인 제한을 설정하세요.
`;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const projectService = new ProjectService(supabase);
  const project = await projectService.getProjectById(id);

  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  }

  const workflowService = new GenerationWorkflowService(supabase);
  const latestRun = await workflowService.getLatestProjectRun(project.id);
  const steps = latestRun ? await workflowService.getRunSteps(latestRun.id) : [];
  const artifacts = latestRun ? await workflowService.getRunArtifacts(latestRun.id) : [];
  const artifactByType = new Map(artifacts.map((artifact) => [artifact.artifact_type, artifact]));
  const landingStepIndex = WORKFLOW_STEPS.findIndex((step) => step.key === "landing_page");
  const preLandingSteps = WORKFLOW_STEPS.slice(0, landingStepIndex);
  const stepByKey = new Map(steps.map((step) => [step.step_key, step]));
  const isLandingCompleted =
    preLandingSteps.every((step) => stepByKey.get(step.key)?.status === "completed") &&
    stepByKey.get("landing_page")?.status === "completed";

  const projectConfig =
    project.config && typeof project.config === "object" && !Array.isArray(project.config)
      ? (project.config as Record<string, unknown>)
      : {};
  const landingArtifact = artifactByType.get("landing_page");
  const landingData =
    landingArtifact?.data && typeof landingArtifact.data === "object" && !Array.isArray(landingArtifact.data)
      ? (landingArtifact.data as Record<string, unknown>)
      : {};
  const cfg = projectConfig as ProjectConfig;
  const generatedSite = isGeneratedSiteData(projectConfig.generatedSiteData)
    ? projectConfig.generatedSiteData
    : isGeneratedSiteData(landingData.generatedSite)
      ? landingData.generatedSite
      : isLandingCompleted
        ? buildGeneratedSiteData({
            artifacts,
            config: cfg,
            projectName: project.name,
            workflowRunId: latestRun?.id,
          })
        : null;

  if (!generatedSite) {
    return NextResponse.json(
      { error: "랜딩페이지 생성 완료 후 WordPress 패키지를 다운로드할 수 있습니다." },
      { status: 409 }
    );
  }

  const elementorJson = JSON.stringify(mapGeneratedSiteToElementor(generatedSite), null, 2);
  const pluginRoot = path.join(process.cwd(), "ai-real-estate-property-manager");
  const pluginFiles = await readDirectoryAsZipFiles(pluginRoot, "ai-real-estate-property-manager");
  const pluginZip = createZip(pluginFiles);
  const packageZip = createZip([
    {
      path: "elementor-template.json",
      data: elementorJson,
    },
    {
      path: "ai-real-estate-property-manager.zip",
      data: pluginZip,
    },
    {
      path: "README.md",
      data: buildPackageReadme(project.name),
    },
  ]);

  return new NextResponse(new Uint8Array(packageZip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="wordpress-install-package.zip"',
      "Content-Length": String(Buffer.byteLength(packageZip)),
    },
  });
}
