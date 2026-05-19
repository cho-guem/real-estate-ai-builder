import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

/**
 * When running inside Claude Code, ANTHROPIC_API_KEY is inherited from the
 * agent's process with an empty value, which prevents @next/env from overriding
 * it with the value in .env.local (dotenv never overwrites existing vars).
 * This reads the file directly as a fallback so the dev server always works.
 */
function readKeyFromEnvFile(): string {
  try {
    const content = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
    const match = content.match(/^ANTHROPIC_API_KEY=(.+)$/m);
    return match ? match[1].trim() : "";
  } catch {
    return "";
  }
}

function resolveApiKey(): string {
  const fromEnv = process.env.ANTHROPIC_API_KEY ?? "";
  if (fromEnv.length > 20 && !fromEnv.startsWith("placeholder")) return fromEnv;
  return readKeyFromEnvFile();
}

export function isAnthropicConfigured(): boolean {
  const key = resolveApiKey();
  return key.length > 20 && !key.startsWith("placeholder");
}

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  const key = resolveApiKey();
  if (!key || key.length <= 20 || key.startsWith("placeholder")) {
    throw new Error("ANTHROPIC_API_KEY is not configured in .env.local");
  }
  if (!_client) {
    _client = new Anthropic({ apiKey: key });
  }
  return _client;
}
