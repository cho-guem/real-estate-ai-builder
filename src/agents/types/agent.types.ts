export type AgentRole =
  | "real-estate-analyst"
  | "content-writer"
  | "seo-optimizer"
  | "design-advisor"
  | "listing-generator";

export type AgentStatus = "idle" | "running" | "completed" | "failed";

export interface AgentMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AgentContext {
  projectId?: string;
  userId: string;
  metadata?: Record<string, unknown>;
}

export interface AgentRunOptions {
  context: AgentContext;
  messages: AgentMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface AgentResult {
  status: AgentStatus;
  output: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  error?: string;
}
