import type { ProjectConfig } from "@/config/project-options";
import type { Json } from "@/types/database.types";
import type {
  BenchmarkArtifact,
  BrandArtifact,
  DesignArtifact,
  FeaturePlanningArtifact,
  LandingPageArtifact,
  ReviewArtifact,
  SeoArtifact,
  SiteArchitectureArtifact,
  StrategyArtifact,
  UxFlowArtifact,
} from "@/types/workflow.types";

function toJson(data: unknown): Json {
  return data as Json;
}

export function buildRealEstateArtifact(
  artifactType: string,
  cfg: ProjectConfig,
  _projectName: string
): Json {
  switch (artifactType) {
    case "benchmark": {
      const artifact: BenchmarkArtifact = {
        title: "벤치마크 후보 선택",
        summary: `${cfg.region} ${cfg.propertyType} ${cfg.transactionType} 시장의 고객은 매물 신뢰도, 지역 전문성, 빠른 상담 연결을 가장 먼저 확인합니다. 새 웹사이트는 단순 랜딩페이지가 아니라 신뢰 확보, 매물 탐색, 상담 전환을 모두 지원하는 비즈니스 플랫폼으로 설계되어야 합니다.`,
        candidates: [
          {
            id: "factoryon-reference",
            siteName: "팩토리온",
            category: "공장/창고 매물 플랫폼",
            previewTone: "참고용 후보",
            heroTitle: "산업용 부동산 조건 검색",
            heroSubtitle: "공장, 창고, 토지 조건을 빠르게 비교하고 상담으로 연결합니다.",
            ctaLabel: "공장·창고 조건 검색",
            heroCopy: "공장·창고 조건을 산업단지, 전력, 층고, 진입도로 기준으로 빠르게 비교하세요.",
            ctaStyle: "공장·창고 조건 비교와 산업단지 매물 탐색을 앞세운 실무형 CTA",
            sectionStructure: ["히어로", "조건 비교", "산업단지 매물", "지도 검색", "상담 CTA", "문의 폼"],
            menuStructure: ["홈", "공장·창고 조건", "산업단지 매물", "지도 검색", "상담 문의"],
            colorTone: "짙은 네이비와 오렌지 포인트로 신뢰감과 실행력을 강조",
            layoutPattern: "검색 필터를 첫 화면 중앙에 배치하고 추천 매물 카드를 바로 이어 붙이는 구조",
            layoutNotes: "첫 화면에서 조건 비교를 보여주고 곧바로 산업단지 매물 카드와 지도 탐색으로 연결합니다.",
            description: "공장, 창고, 산업단지 관련 정보를 다루는 실무형 탐색 서비스로 참고할 수 있습니다.",
            whyUseful: "공장·창고 고객이 중요하게 보는 입지, 업종 적합성, 조건 비교 흐름을 설계할 때 유용합니다.",
            strengths: ["산업용 부동산 맥락이 분명함", "조건 중심 탐색 구조를 참고하기 좋음", "실무 고객의 정보 탐색 의도가 명확함"],
            weaknesses: ["브랜드 감성보다 정보 전달에 치우칠 수 있음", "상담 전환 장치가 별도로 보강되어야 함"],
            borrow: ["업종별 조건 분류", "공장·창고 전용 문의 항목", "입지 조건 중심 카드 구성"],
            fitScore: 94,
            websiteUrl: "https://www.factoryon.go.kr",
          },
          {
            id: "r114-commercial",
            siteName: "부동산R114",
            category: "상업용 부동산",
            previewTone: "참고용 후보",
            heroTitle: "지역 부동산 데이터와 매물 상담",
            heroSubtitle: "시세, 지역 정보, 추천 매물을 함께 보여주는 신뢰형 구조입니다.",
            ctaLabel: "시장 정보 확인",
            heroCopy: "지역 시세와 시장 정보를 확인하고 조건에 맞는 매물을 비교하세요.",
            ctaStyle: "시세 정보 확인과 맞춤 상담을 함께 제공하는 정보형 CTA",
            sectionStructure: ["히어로", "시세 요약", "시장 정보", "매물 비교", "상담 CTA", "FAQ"],
            menuStructure: ["홈", "시세 정보", "매물 비교", "지역 리포트", "상담 문의"],
            colorTone: "차분한 블루 계열과 밝은 배경으로 데이터 신뢰감을 강조",
            layoutPattern: "데이터 요약 카드와 상담 CTA를 나란히 배치하는 정보형 히어로",
            layoutNotes: "데이터 요약 카드와 지역 리포트를 먼저 배치한 뒤 매물 비교와 상담 문의로 이어갑니다.",
            description: "시세, 매물, 부동산 정보 콘텐츠를 함께 제공하는 종합 부동산 서비스입니다.",
            whyUseful: "매물 정보와 시장 리포트를 함께 배치해 신뢰를 만드는 정보 구조를 참고할 수 있습니다.",
            strengths: ["부동산 정보 신뢰도가 높음", "시세와 콘텐츠 연결이 자연스러움", "검색 의도별 정보 구성이 명확함"],
            weaknesses: ["대형 포털 구조라 개별 중개 브랜드의 개성이 약해질 수 있음", "상담 CTA는 별도 강화가 필요함"],
            borrow: ["시세 요약 카드", "지역 시장 정보 섹션", "검색 의도별 페이지 구조"],
            fitScore: 89,
            websiteUrl: "https://www.r114.com",
          },
          {
            id: "nemo-commercial",
            siteName: "네모",
            category: "상가/오피스텔 탐색",
            previewTone: "참고용 후보",
            heroTitle: "지도와 필터로 찾는 상가·오피스텔",
            heroSubtitle: "상권, 임대료, 층수, 조건을 빠르게 좁혀 상담으로 연결합니다.",
            ctaLabel: "지도 필터로 찾기",
            heroCopy: "상가·오피스텔 매물을 지도와 필터로 빠르게 찾고 조건별로 비교하세요.",
            ctaStyle: "지도 탐색과 조건 필터를 앞세운 검색 중심 CTA",
            sectionStructure: ["히어로", "지도 검색", "필터별 매물", "상권 분석", "상담 CTA", "문의 폼"],
            menuStructure: ["홈", "지도 검색", "상가·오피스텔", "상권 분석", "상담 문의"],
            colorTone: "밝은 그린과 화이트 배경으로 탐색성과 접근성을 강조",
            layoutPattern: "지도 프리뷰와 필터형 매물 카드를 첫 화면부터 보여주는 구조",
            layoutNotes: "지도와 필터를 상단에 배치하고 상가·오피스텔 카드 목록을 바로 보여줍니다.",
            description: "상가와 오피스텔을 지도, 필터, 카드 목록으로 빠르게 탐색하는 구조를 참고할 수 있습니다.",
            whyUseful: "상가·오피스텔 고객이 원하는 위치, 업종, 임대료 조건을 빠르게 좁히는 흐름을 설계할 때 유용합니다.",
            strengths: ["지도 기반 탐색이 직관적임", "상가·오피스텔 조건 필터가 명확함", "목록 비교와 문의 흐름이 빠름"],
            weaknesses: ["브랜드 스토리와 전문 상담 메시지는 별도 보강이 필요함", "시장 분석 콘텐츠는 추가 설계가 필요함"],
            borrow: ["지도 중심 탐색", "상가·오피스텔 조건 필터", "필터형 매물 카드"],
            fitScore: 86,
            websiteUrl: "https://www.nemoapp.kr",
          },
          {
            id: "zigbang-business",
            siteName: "직방",
            category: "기업형 부동산 서비스",
            previewTone: "참고용 후보",
            heroTitle: "쉽고 빠른 부동산 탐색",
            heroSubtitle: "모바일에서도 보기 쉬운 카드형 탐색과 간결한 CTA가 강점입니다.",
            ctaLabel: "조건 입력하기",
            layoutPattern: "큰 검색창과 브랜드 메시지를 앞세운 대중형 히어로",
            description: "브랜드 신뢰, 앱 기반 탐색, 빠른 문의 경험을 갖춘 대중형 부동산 서비스입니다.",
            whyUseful: "기업형 부동산 서비스의 신뢰감 있는 UI와 쉬운 탐색 경험을 참고할 수 있습니다.",
            strengths: ["브랜드 인지도가 높음", "모바일 탐색 경험이 직관적임", "서비스 안내와 매물 탐색이 균형 있음"],
            weaknesses: ["공장·창고 같은 특수 매물 설명은 부족할 수 있음", "전문 상담형 콘텐츠는 별도 보완이 필요함"],
            borrow: ["모바일 우선 카드 UI", "간결한 CTA 문구", "서비스 신뢰를 보여주는 화면 구성"],
            fitScore: 92,
            websiteUrl: "https://www.zigbang.com",
          },
          {
            id: "naver-map-land",
            siteName: "네이버 부동산",
            category: "지도 기반 매물 탐색 서비스",
            previewTone: "참고용 후보",
            heroTitle: "지도에서 바로 찾는 추천 매물",
            heroSubtitle: "위치, 입지, 주변 정보를 한눈에 확인하는 지도 중심 구조입니다.",
            ctaLabel: "지도 검색 시작",
            layoutPattern: "지도 프리뷰와 매물 목록을 병렬 배치하는 탐색형 히어로",
            description: "지도, 필터, 목록을 결합해 위치 기반으로 매물을 탐색하는 대표적인 부동산 서비스입니다.",
            whyUseful: "지도와 필터를 활용해 지역·입지 중심 고객을 빠르게 상담으로 연결하는 구조를 참고할 수 있습니다.",
            strengths: ["지도 기반 위치 인지가 뛰어남", "필터와 목록 전환이 익숙함", "매물 탐색 신뢰도가 높음"],
            weaknesses: ["개별 중개사의 전문성 표현은 제한적임", "상담 전환을 위한 브랜드 메시지는 별도 설계가 필요함"],
            borrow: ["지도와 목록의 병행 구조", "지역 필터", "입지 중심 매물 카드"],
            fitScore: 83,
            websiteUrl: "https://land.naver.com",
          },
        ],
        selectedCandidateIds: [],
        competitors: [
          {
            name: "지역 중개법인 랜딩페이지",
            strengths: ["전화 상담 버튼이 명확함", "지역명 중심의 검색 키워드 사용이 자연스러움"],
            weaknesses: ["매물별 상세 정보가 부족함", "브랜드 신뢰를 보여주는 근거가 약함"],
            takeaways: ["첫 화면에서 지역 전문성을 강조", "문의 폼 이전에 상담 실적과 검증 포인트 제시"],
          },
          {
            name: "부동산 포털 매물 리스트",
            strengths: ["면적, 가격, 위치 정보를 빠르게 비교 가능", "매물 탐색 흐름이 익숙함"],
            weaknesses: ["브랜드 차별성이 낮음", "상담자로서의 전문성이 드러나지 않음"],
            takeaways: ["카드형 매물 요약을 적용", "단순 매물 소개보다 맞춤 상담 관점 강화"],
          },
        ],
        opportunities: [
          "첫 화면에 대표 상담 버튼과 연락 수단을 함께 배치합니다.",
          "제목과 섹션명에 지역명, 매물 유형, 거래 유형을 일관되게 사용합니다.",
          "시장 분석, 추천 매물, 상담 신청 기능을 하나의 흐름으로 연결합니다.",
        ],
      };
      return toJson(artifact);
    }
    case "strategy": {
      const artifact: StrategyArtifact = {
        title: "웹사이트 사업 전략",
        summary: `${cfg.region} ${cfg.propertyType} 고객을 설득하기 위해 정보 제공형 사이트와 상담 전환형 랜딩페이지의 장점을 결합합니다.`,
        businessGoal: `${cfg.transactionType} 문의를 안정적으로 확보하고, 상담 전 고객의 조건과 니즈를 미리 파악하는 것입니다.`,
        targetAudience: `${cfg.targetAudience} 중 ${cfg.region}에서 ${cfg.propertyType}를 검토하는 고관여 방문자`,
        positioning: "지역 시장을 이해하는 전문 중개 파트너이자 조건에 맞는 매물을 빠르게 선별해 주는 상담 채널",
        conversionGoals: ["전화 상담 클릭", "조건 기반 매물 문의 제출", "추천 매물 상세 확인", "카카오톡 또는 폼 상담 요청"],
        successMetrics: ["상담 폼 제출 수", "전화 버튼 클릭률", "추천 매물 카드 클릭률", "방문 후 문의까지 걸리는 평균 시간"],
      };
      return toJson(artifact);
    }
    case "site_architecture": {
      const artifact: SiteArchitectureArtifact = {
        title: "사이트 아키텍처 설계",
        summary: "초기 버전은 랜딩 중심으로 시작하되, 향후 매물 목록과 지역별 상세 페이지로 확장 가능한 구조를 권장합니다.",
        approved: false,
        menus: [
          { id: "home", label: "홈", submenus: ["핵심 소개", "추천 매물", "상담 문의"] },
          { id: "listings", label: "매물", submenus: ["추천 매물", "조건별 매물", "신규 매물"] },
          { id: "market", label: "지역 분석", submenus: ["입지 분석", "시세 흐름", "투자 포인트"] },
          { id: "contact", label: "상담 문의", submenus: ["빠른 상담", "조건 남기기"] },
        ],
        sitemap: [
          { key: "홈", title: "메인 랜딩페이지", role: "브랜드 신뢰, 핵심 매물, 상담 전환을 한 화면에서 연결", priority: "필수" },
          { key: "매물목록", title: "추천 매물 목록", role: "대표 매물과 조건별 비교 정보를 제공", priority: "필수" },
          { key: "지역분석", title: "지역 시장 분석", role: "입지, 수요, 가격 흐름을 설명해 상담 신뢰도를 높임", priority: "권장" },
          { key: "상담문의", title: "상담 문의", role: "고객 조건을 접수하고 후속 상담으로 연결", priority: "필수" },
        ],
        navigation: [
          { label: "홈", pageKey: "홈" },
          { label: "추천 매물", pageKey: "매물목록" },
          { label: "지역 분석", pageKey: "지역분석" },
          { label: "상담 문의", pageKey: "상담문의" },
        ],
      };
      return toJson(artifact);
    }
    case "feature_planning": {
      const artifact: FeaturePlanningArtifact = {
        title: "핵심 기능 기획",
        summary: "웹사이트는 매물 소개만 하는 페이지가 아니라, 방문자의 조건을 수집하고 상담 품질을 높이는 도구여야 합니다.",
        approved: false,
        coreFeatures: [
          { id: "map-search", enabled: true, name: "지도 검색", purpose: "방문자가 관심 지역과 주변 입지를 지도에서 직관적으로 확인", priority: "필수" },
          { id: "compare", enabled: true, name: "비교 기능", purpose: "가격, 면적, 위치, 용도 조건을 나란히 비교해 상담 전 의사결정을 돕습니다.", priority: "필수" },
          { id: "favorites", enabled: true, name: "관심 매물", purpose: "방문자가 검토 중인 매물을 저장하고 상담 시 조건을 빠르게 공유", priority: "권장" },
          { id: "admin-listing", enabled: true, name: "관리자 등록", purpose: "운영자가 신규 매물과 추천 매물을 쉽게 등록하고 수정", priority: "필수" },
          { id: "ai-recommendation", enabled: true, name: "AI 추천", purpose: "입력된 조건을 바탕으로 적합한 매물 유형과 상담 방향을 추천", priority: "권장" },
          { id: "inquiry-storage", enabled: true, name: "문의 저장", purpose: "상담 신청 내역과 고객 희망 조건을 저장해 후속 응대에 활용", priority: "필수" },
          { id: "region-filter", enabled: true, name: "지역 필터", purpose: "지역, 역세권, 산업단지, 주요 도로 접근성 기준으로 매물을 탐색", priority: "필수" },
        ],
        futureFeatures: ["매물 즐겨찾기", "관리자용 매물 등록 화면", "상담 신청 내역 관리", "지역별 자동 SEO 페이지 생성"],
      };
      return toJson(artifact);
    }
    case "ux_flow": {
      const artifact: UxFlowArtifact = {
        title: "방문자 UX 흐름 설계",
        summary: "방문자는 지역 전문성을 확인한 뒤 매물 예시를 보고, 부담 없이 조건을 남기는 흐름으로 안내되어야 합니다.",
        approved: false,
        notes: "",
        revisionRequest: "",
        mobileRecommendations: ["전화 상담 버튼은 화면 하단에 고정합니다.", "매물 카드는 한 화면에 하나씩 명확하게 보여줍니다.", "문의 폼은 1차 필수 정보만 먼저 입력받습니다."],
        flows: [
          { name: "첫 방문 상담 전환 흐름", steps: ["지역/매물 유형 확인", "신뢰 근거 확인", "추천 매물 비교", "상담 조건 입력", "전화 또는 폼 제출"], goal: "방문자의 첫 문의 장벽을 낮추고 상담 요청을 확보" },
          { name: "매물 탐색 흐름", steps: ["추천 매물 목록 진입", "면적과 가격 비교", "관심 매물 확인", "비슷한 조건 문의"], goal: "정확한 매물 정보가 부족해도 상담으로 자연스럽게 연결" },
        ],
        frictionReducers: ["상담 폼 필드는 꼭 필요한 정보만 먼저 요청합니다.", "모든 주요 섹션에 상담 버튼을 반복 배치합니다.", "전문 용어보다 고객이 이해하기 쉬운 매물 조건 표현을 사용합니다."],
      };
      return toJson(artifact);
    }
    case "seo": {
      const artifact: SeoArtifact = {
        approved: false,
        title: `${cfg.region} ${cfg.propertyType} ${cfg.transactionType} 전문 상담`,
        metaDescription: `${cfg.region} ${cfg.propertyType} ${cfg.transactionType}을 찾는 고객을 위해 지역 시장 분석, 추천 매물, 맞춤 상담을 제공합니다.`,
        primaryKeywords: [`${cfg.region} ${cfg.propertyType}`, `${cfg.propertyType} ${cfg.transactionType}`],
        secondaryKeywords: [cfg.targetAudience, "부동산 상담", "매물 문의", "상업용 부동산"],
        pageRecommendations: [
          { pageKey: "홈", title: `${cfg.region} ${cfg.propertyType} ${cfg.transactionType}`, metaDescription: "구매 의사가 높은 방문자를 상담 문의로 연결하는 핵심 랜딩페이지입니다.", keywords: [`${cfg.region} 부동산`, cfg.propertyType, cfg.transactionType] },
        ],
      };
      return toJson(artifact);
    }
    case "brand": {
      const artifact: BrandArtifact = {
        approved: false,
        name: `${cfg.region} ${cfg.propertyType} 전문 부동산`,
        positioning: `${cfg.region} ${cfg.propertyType}를 찾는 ${cfg.targetAudience}에게 실질적인 매물 판단 기준과 빠른 상담을 제공하는 전문 부동산 사이트입니다.`,
        voice: "전문적이지만 과장되지 않고, 지역 시장을 잘 아는 상담자의 어조를 유지합니다.",
        toneKeywords: ["전문적인", "신뢰감 있는", "지역 밀착형", "실무적인", "빠른 응대"],
        audience: cfg.targetAudience,
        valuePropositions: ["지역별 시세와 수요 흐름을 반영한 상담", "조건에 맞는 추천 매물 선별", "문의 후 빠른 응대와 후속 안내"],
        callsToAction: ["상담 요청하기", "추천 매물 보기", "조건에 맞는 매물 문의하기"],
      };
      return toJson(artifact);
    }
    case "design": {
      const artifact: DesignArtifact = {
        approved: false,
        direction: "신뢰감 있는 중개법인 톤을 바탕으로, 매물 탐색과 상담 전환이 빠르게 이어지는 실무형 랜딩페이지 디자인입니다.",
        layoutPrinciples: ["첫 화면에서 지역 전문성, 대표 혜택, 상담 CTA를 즉시 보여줍니다.", "매물 카드는 가격, 면적, 입지, 특징을 한눈에 비교할 수 있게 구성합니다.", "시장 분석, 추천 매물, 상담 폼이 자연스럽게 이어지는 흐름을 유지합니다."],
        paletteOptions: [
          { id: "trust-navy", name: "신뢰 네이비", description: "중개법인의 전문성과 안정감을 강조하는 팔레트", colors: ["#172033", "#f97316", "#f8fafc"] },
          { id: "urban-green", name: "도심 그린", description: "지역성과 성장 가능성을 차분하게 보여주는 팔레트", colors: ["#163a2f", "#14b8a6", "#f7f5ef"] },
          { id: "premium-black", name: "프리미엄 블랙", description: "고가 매물과 투자 상담에 어울리는 선명한 팔레트", colors: ["#111827", "#d6a94a", "#f9fafb"] },
        ],
        typographyOptions: [
          { id: "professional-sans", name: "전문 산세리프", description: "제목은 굵게, 본문은 읽기 쉽게 구성하는 실무형 조합" },
          { id: "editorial-serif", name: "리포트 세리프", description: "시장 분석과 투자 자문 느낌을 강화하는 조합" },
          { id: "compact-modern", name: "컴팩트 모던", description: "매물 목록과 필터가 많은 화면에 적합한 조밀한 조합" },
        ],
        layoutOptions: [
          { id: "conversion-landing", name: "상담 전환형", description: "신뢰 근거, 추천 매물, 문의 폼이 빠르게 이어지는 구성" },
          { id: "listing-first", name: "매물 탐색형", description: "검색과 카드 목록을 앞세워 탐색 속도를 높이는 구성" },
          { id: "advisory-report", name: "자문 리포트형", description: "시장 분석과 전문가 코멘트를 중심으로 설득하는 구성" },
        ],
        heroStyleOptions: [
          { id: "split-consulting", name: "분할 상담형 히어로", description: "좌측에는 신뢰 문구, 우측에는 문의 카드와 추천 조건을 배치합니다." },
          { id: "search-first", name: "검색 우선형 히어로", description: "첫 화면에서 지역, 유형, 가격 조건을 바로 입력하게 만듭니다." },
          { id: "image-led", name: "대표 이미지형 히어로", description: "현장 사진이나 대표 매물 이미지를 크게 보여주고 CTA를 겹쳐 배치합니다." },
        ],
        heroImageOptions: [
          { id: "industrial-site", name: "현장 중심 이미지", description: "공장, 창고, 토지, 상가 외관처럼 실제 공간감을 보여주는 이미지 방향" },
          { id: "map-data", name: "지도·데이터 이미지", description: "입지 분석과 지도 검색이 강한 서비스처럼 보이는 이미지 방향" },
          { id: "consulting-team", name: "대표·상담 이미지", description: "대표자 또는 상담 팀의 신뢰감을 전면에 내세우는 이미지 방향" },
        ],
        selectedPaletteId: "",
        selectedTypographyId: "",
        selectedLayoutId: "",
        selectedHeroStyleId: "",
        selectedHeroImageId: "",
        logoAsset: "",
        brandImageAsset: "",
        colorPalette: [
          { name: "신뢰 네이비", value: "#172033", usage: "히어로 영역과 푸터의 안정감 있는 배경" },
          { name: "상담 오렌지", value: "#f97316", usage: "주요 CTA 버튼과 강조 정보" },
          { name: "정보형 그레이", value: "#f8fafc", usage: "매물 카드와 분석 섹션의 배경" },
        ],
        typography: { heading: "굵고 명확한 한국어 산세리프 제목", body: "긴 설명도 편하게 읽히는 넉넉한 행간의 본문" },
        components: ["히어로 행동 유도 영역", "신뢰 배지 영역", "추천 매물 카드", "상담 문의 폼", "검색 키워드 태그"],
      };
      return toJson(artifact);
    }
    case "landing_page": {
      const artifact: LandingPageArtifact = {
        generated: false,
        headline: `${cfg.region} ${cfg.propertyType} ${cfg.transactionType}, 조건에 맞는 매물을 빠르게 찾으세요`,
        subheadline: `${cfg.targetAudience}를 위한 지역 기반 부동산 웹사이트의 첫 랜딩페이지 초안입니다.`,
        preview: {
          propertySectionEyebrow: "추천 매물",
          propertySectionTitle: "조건에 맞는 매물을 빠르게 비교하세요",
          ctaTitle: "조건을 남기면 맞춤 매물을 선별해드립니다",
          mapTitle: "지도 기반 입지 검토",
          mapDescription: `${cfg.region} 주요 입지와 매물 밀집 구역을 보여줍니다.`,
          footerNote: "목업 프리뷰 / 실제 AI 연결 전 검증용",
          propertyCards: [
            {
              title: `${cfg.region} ${cfg.propertyType} 추천 매물`,
              meta: `${cfg.transactionType} / 역세권 접근 우수`,
              price: "조건 협의",
              body: "면적, 진입로, 주차, 업종 적합성을 상담 전 빠르게 확인할 수 있는 대표 매물입니다.",
            },
            {
              title: "입지 우선 검토 매물",
              meta: "산업단지 인접 / 물류 동선 우수",
              price: "상담 후 안내",
              body: "지역 수요와 운영 조건을 함께 검토해 후보지를 좁히는 데 적합합니다.",
            },
            {
              title: "맞춤 추천 대기 매물",
              meta: "희망 조건 기반 선별",
              price: "문의 필요",
              body: "희망 면적과 예산을 남기면 조건에 맞는 매물을 우선 안내합니다.",
            },
          ],
        },
        sections: [
          { key: "히어로", title: "지역성과 전문성을 첫 화면에서 전달", body: cfg.purpose, cta: "상담 요청하기" },
          { key: "매물목록", title: "추천 매물과 상담 연결", body: "가격, 면적, 위치, 주요 특징을 정리한 매물 카드를 통해 방문자가 빠르게 비교하고 문의할 수 있게 합니다.", cta: "추천 매물 보기" },
        ],
        leadForm: { title: "조건에 맞는 매물 문의", fields: ["이름", "연락처", "회사명", "희망 조건"], submitLabel: "문의 보내기" },
      };
      return toJson(artifact);
    }
    case "review": {
      const artifact: ReviewArtifact = {
        approved: false,
        score: 86,
        summary: "생성된 랜딩 프리뷰가 CTA, 섹션 완성도, 활성화된 기능, 브랜드 톤, 모바일 UX 흐름을 일관되게 반영하는지 검토합니다.",
        checklist: [
          { label: "CTA가 주요 섹션에 포함되어 있음", passed: true },
          { label: "비어 있는 랜딩 섹션이 없음", passed: true },
          { label: "활성화된 핵심 기능이 프리뷰에 반영됨", passed: true },
          { label: "브랜드 톤과 카피 방향이 일관됨", passed: true },
          { label: "모바일 UX 흐름 권장사항이 존재함", passed: true },
        ],
        issues: ["실제 매물 데이터와 지도 API는 아직 목업으로 표시됩니다."],
        passedChecks: ["CTA 확인", "빈 섹션 확인", "활성 기능 반영 확인", "브랜드 톤 확인", "모바일 흐름 확인"],
        warnings: ["실제 매물 데이터는 아직 예시 문구입니다", "지도 영역은 실제 지도 API 연결 전 목업입니다"],
        requiredFixes: [],
      };
      return toJson(artifact);
    }
    default:
      return {};
  }
}
