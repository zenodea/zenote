export const AI_PROVIDERS = [
  "anthropic",
  "openai",
  "google",
  "openrouter",
] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  anthropic: "Claude",
  openai: "OpenAI",
  google: "Gemini",
  openrouter: "OpenRouter",
};

export const AI_PROVIDER_KEY_HINTS: Record<AiProvider, string> = {
  anthropic: "console.anthropic.com",
  openai: "platform.openai.com",
  google: "aistudio.google.com",
  openrouter: "openrouter.ai/keys",
};

export const AI_PROVIDER_MODELS: Record<AiProvider, readonly string[]> = {
  anthropic: ["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5"],
  openai: ["gpt-5.6", "gpt-5.5", "gpt-5.4", "gpt-5.4-mini"],
  google: ["gemini-3.7-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"],
  openrouter: [],
};

export const AI_DEFAULT_MODELS: Record<AiProvider, string> = {
  anthropic: "claude-opus-5",
  openai: "gpt-5.6",
  google: "gemini-3.5-flash-lite",
  openrouter: "anthropic/claude-opus-5",
};

export function isAiProvider(value: unknown): value is AiProvider {
  return (
    typeof value === "string" &&
    (AI_PROVIDERS as readonly string[]).includes(value)
  );
}
