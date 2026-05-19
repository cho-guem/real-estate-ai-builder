import { BaseAgent } from "../base/agent.base";
import { getAnthropicClient } from "@/lib/anthropic";
import type { AgentRole, AgentRunOptions, AgentResult } from "../types/agent.types";

export class SeoAgent extends BaseAgent {
  readonly role: AgentRole = "seo-optimizer";

  readonly systemPrompt = `당신은 한국 부동산 웹사이트 SEO 전문가입니다.
자연스러운 가독성을 유지하면서 검색엔진 최적화 문구를 작성합니다.
지역 키워드와 매물 유형을 효과적으로 활용합니다.`;

  async run(options: AgentRunOptions): Promise<AgentResult> {
    const client = getAnthropicClient();
    const userMessages = options.messages.filter((m) => m.role !== "system");

    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: options.maxTokens ?? 512,
      system: this.systemPrompt,
      messages: userMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const output = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    return {
      status: "completed",
      output,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}
