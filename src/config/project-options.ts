// 공장 특화 부동산 SaaS — 매물 유형은 산업/상업 우선 순서로 정렬
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
export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export type TargetAudience = (typeof TARGET_AUDIENCES)[number];

export type ProjectConfig = {
  region: string;
  propertyType: PropertyType;
  transactionType: TransactionType;
  targetAudience: TargetAudience;
  purpose: string;
};
