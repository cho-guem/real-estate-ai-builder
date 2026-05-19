import { BaseAgent } from "../base/agent.base";
import { getAnthropicClient } from "@/lib/anthropic";
import type { AgentRole, AgentRunOptions, AgentResult } from "../types/agent.types";

export class ListingAgent extends BaseAgent {
  readonly role: AgentRole = "listing-generator";

  readonly systemPrompt = `당신은 한국 부동산 매물 전문 카피라이터입니다.
매물의 핵심 특징을 강조하고 SEO에 최적화된 매력적인 한국어 매물 설명을 작성합니다.`;

  async run(options: AgentRunOptions): Promise<AgentResult> {
    const client = getAnthropicClient();
    const userMessages = options.messages.filter((m) => m.role !== "system");

    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: options.maxTokens ?? 1024,
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
