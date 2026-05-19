import type { AgentRole, AgentRunOptions, AgentResult, AgentMessage } from "../types/agent.types";

export abstract class BaseAgent {
  abstract readonly role: AgentRole;
  abstract readonly systemPrompt: string;

  abstract run(options: AgentRunOptions): Promise<AgentResult>;

  protected buildMessages(userMessages: AgentMessage[]): AgentMessage[] {
    return [{ role: "system", content: this.systemPrompt }, ...userMessages];
  }
}
