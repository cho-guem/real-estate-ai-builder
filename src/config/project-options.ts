export const INDUSTRY_OPTIONS = [
  { value: "real_estate", label: "부동산", enabled: true },
  { value: "clinic", label: "병원", enabled: false },
  { value: "manufacturing", label: "제조업", enabled: false },
  { value: "academy", label: "교육/학원", enabled: false },
  { value: "commerce", label: "쇼핑몰", enabled: false },
  { value: "legal_tax", label: "법률/세무", enabled: false },
] as const;

export const REAL_ESTATE_SPECIALTIES = [
  "공장,창고,토지",
  "상가,오피스텔",
  "아파트,주택",
  "펜션·숙박",
  "지역 종합 부동산",
] as const;

export const REAL_ESTATE_SPECIALTY_GUIDES: Record<RealEstateSpecialty, string> = {
  "공장,창고,토지": "산업단지, 층고, 전력, 호이스트, 진입도로, 공장등록과 지도 기반 검색을 중심으로 구성합니다.",
  "상가,오피스텔": "권리금, 유동인구, 업종 추천, 상권 분석, 임대료, 수익률과 관리비 정보를 강조합니다.",
  "아파트,주택": "생활 인프라, 주거환경, 단지 정보, 평형, 학군, 교통, 실거래가와 분양 정보를 반영합니다.",
  "펜션·숙박": "관광지 접근성, 객실 수, 전망, 운영수익, 숙박업 인허가와 펜션 매매 SEO를 중심으로 설계합니다.",
  "지역 종합 부동산": "지역 매물, 아파트/상가/토지/주택 통합 탐색, 지역 전문성과 지도 검색을 강조합니다.",
};

export function mapSpecialtyToPropertyType(specialty: RealEstateSpecialty): PropertyType {
  if (specialty === "공장,창고,토지") return "공장";
  if (specialty === "상가,오피스텔") return "상가";
  if (specialty === "아파트,주택") return "아파트";
  if (specialty === "펜션·숙박") return "단독주택";
  return "토지";
}

// 기존 미리보기/배포 파이프라인 호환을 위해 세부 유형과 별도로 중심 매물 유형은 유지합니다.
export const PROPERTY_TYPES = [
  "공장",
  "창고",
  "상가",
  "사무실",
  "토지",
  "아파트",
  "빌라/다세대",
  "단독주택",
  "오피스텔",
] as const;

export const TRANSACTION_TYPES = ["매매", "전세", "월세", "임대"] as const;

export const TARGET_AUDIENCES = [
  "제조업체",
  "물류/창고업체",
  "투자자",
  "소규모 사업자",
  "스타트업/벤처",
  "대기업/법인",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];
export type Industry = (typeof INDUSTRY_OPTIONS)[number]["value"];
export type RealEstateSpecialty = (typeof REAL_ESTATE_SPECIALTIES)[number];
export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export type TargetAudience = (typeof TARGET_AUDIENCES)[number];
export type DeploymentMode = "managed_hosting" | "existing_hosting";

export type ProjectConfig = {
  industry?: Industry;
  industryTemplateId?: "real_estate";
  deploymentMode?: DeploymentMode;
  realEstateType?: RealEstateSpecialty;
  propertySpecialty?: RealEstateSpecialty;
  region: string;
  propertyType: PropertyType;
  transactionType: TransactionType;
  targetAudience: TargetAudience;
  purpose: string;
};
