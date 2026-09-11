import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogle } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { AI_DEFAULT_MODELS, isAiProvider } from "@/lib/ai-providers";

const OPENROUTER_URL = "https://openrouter.ai/api/v1";

export type ModelRequest = {
  provider?: unknown;
  model?: unknown;
  apiKey?: unknown;
};

export function resolveModel(
  body: ModelRequest | null,
): { model: LanguageModel } | { error: string } {
  const provider = body?.provider;
  if (!isAiProvider(provider)) {
    return { error: "Choose an assistant provider in settings." };
  }

  const apiKey = body?.apiKey;
  if (typeof apiKey !== "string" || apiKey.trim() === "") {
    return {
      error: `Add your ${provider} key in settings to use the assistant.`,
    };
  }

  const name =
    typeof body?.model === "string" && body.model.trim() !== ""
      ? body.model.trim()
      : AI_DEFAULT_MODELS[provider];

  switch (provider) {
    case "anthropic":
      return { model: createAnthropic({ apiKey })(name) };
    case "openai":
      return { model: createOpenAI({ apiKey })(name) };
    case "google":
      return { model: createGoogle({ apiKey })(name) };
    case "openrouter":
      return { model: createOpenAI({ apiKey, baseURL: OPENROUTER_URL })(name) };
  }
}
