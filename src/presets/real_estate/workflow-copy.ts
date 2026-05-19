import type { IndustryWorkflowStepCopyMap } from "@/presets/types";

export const realEstateWorkflowSteps: IndustryWorkflowStepCopyMap = {
  benchmark: {
    label: "벤치마크 분석",
    agentName: "벤치마크 에이전트",
    description: "동종 부동산 웹사이트의 구조, 신뢰 장치, 전환 방식을 비교합니다.",
  },
  strategy: {
    label: "사업 전략",
    agentName: "전략 에이전트",
    description: "웹사이트의 사업 목표, 타깃 고객, 핵심 전환 목표를 정의합니다.",
  },
  site_architecture: {
    label: "사이트 아키텍처",
    agentName: "사이트 아키텍처 에이전트",
    description: "실제 비즈니스 사이트에 필요한 페이지 구조와 내비게이션을 설계합니다.",
  },
  feature_planning: {
    label: "기능 기획",
    agentName: "기능 기획 에이전트",
    description: "매물 탐색, 문의, 신뢰 확보에 필요한 기능을 우선순위별로 정리합니다.",
  },
  ux_flow: {
    label: "UX 흐름",
    agentName: "UX 플로우 에이전트",
    description: "방문자가 정보를 확인하고 상담 문의까지 이동하는 흐름을 설계합니다.",
  },
  seo: {
    label: "SEO 전략",
    agentName: "SEO 에이전트",
    description: "검색 노출을 위한 페이지 제목, 메타 문구, 핵심 키워드를 설계합니다.",
  },
  brand: {
    label: "브랜드 전략",
    agentName: "브랜드 에이전트",
    description: "타깃 고객에게 신뢰를 주는 포지셔닝과 문체를 정의합니다.",
  },
  design: {
    label: "디자인 시스템",
    agentName: "디자인 에이전트",
    description: "부동산 랜딩페이지에 맞는 색상, 타이포그래피, UI 구성 요소를 정리합니다.",
  },
  landing_page: {
    label: "랜딩페이지 생성",
    agentName: "랜딩페이지 에이전트",
    description: "앞 단계의 전략과 콘텐츠를 바탕으로 랜딩페이지 초안을 구성합니다.",
  },
  review: {
    label: "검토 에이전트",
    agentName: "검토 에이전트",
    description: "완성된 산출물의 누락, 전환 흐름, 개선 필요 사항을 점검합니다.",
  },
};
