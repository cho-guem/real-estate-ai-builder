import { getAnthropicClient } from "@/lib/anthropic";
import type { ProjectConfig } from "@/config/project-options";
import type { GeneratedContent } from "@/types/generation.types";

const SYSTEM_PROMPT = `당신은 한국 부동산 SaaS 플랫폼의 AI 분석가입니다.
사용자가 제공한 프로젝트 설정을 바탕으로 부동산 웹사이트 구축에 필요한 분석 결과를 생성합니다.
반드시 아래 JSON 스키마를 정확히 따르는 유효한 JSON만 반환하세요. 마크다운, 코드블록, 설명 텍스트를 포함하지 마세요.`;

const RESPONSE_SCHEMA = `{
  "region": { "title": string, "body": string },
  "benchmark": { "title": string, "body": string },
  "seo": {
    "title": string,
    "rows": [
      { "label": "사이트 제목", "value": string },
      { "label": "메타 디스크립션", "value": string },
      { "label": "추천 키워드", "value": string }
    ]
  },
  "structure": { "title": string, "pages": string[] },
  "report": { "title": string, "body": string, "score": number }
}`;

function buildUserPrompt(cfg: ProjectConfig): string {
  return `다음 프로젝트 설정을 분석하여 부동산 웹사이트 구축 계획을 JSON으로 반환하세요.

## 프로젝트 설정
- 지역: ${cfg.region}
- 매물 유형: ${cfg.propertyType}
- 거래 유형: ${cfg.transactionType}
- 타깃 고객: ${cfg.targetAudience}
- 사이트 목적: ${cfg.purpose}

## 요청 항목 (모두 한국어로 작성)

1. **region (지역 분석)**: 해당 지역의 ${cfg.propertyType} 시장 특성, 수요 동향, 인프라 현황, 투자 가치를 3~4문장으로 분석
2. **benchmark (벤치마킹 요약)**: 동종 업계 유사 사이트 3곳의 강점과 차별화 포인트를 분석, ${cfg.targetAudience}을 위한 개선 방향 제시
3. **seo (SEO 문구)**: 사이트 제목(60자 이내), 메타 디스크립션(150자 이내), 추천 키워드(5~7개, 쉼표 구분)
4. **structure (사이트 구조)**: 5~6개 핵심 페이지 목록, 각 페이지의 주요 목적을 한 줄로 기술 (예: "페이지명 — 설명")
5. **report (검토 리포트)**: 종합 평가 3~4문장 + score(0~100, ${cfg.propertyType} ${cfg.transactionType} 시장 적합도 기반 정수)

## JSON 스키마
${RESPONSE_SCHEMA}

JSON만 반환하세요:`;
}

export async function generateWebsitePlan(
  cfg: ProjectConfig
): Promise<GeneratedContent> {
  const client = getAnthropicClient();

  const message = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(cfg) }],
  });

  const raw = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  // Strip potential markdown code fences if model adds them
  const jsonStr = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`AI 응답을 JSON으로 파싱하지 못했습니다: ${jsonStr.slice(0, 200)}`);
  }

  return parsed as GeneratedContent;
}
