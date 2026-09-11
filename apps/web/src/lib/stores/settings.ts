"use client";

import { createPersistentStore } from "../store";
import type { SearchMode } from "../search";
import {
  AI_DEFAULT_MODELS,
  AI_PROVIDERS,
  isAiProvider,
  type AiProvider,
} from "../ai-providers";

export type Settings = {
  showBacklinks: boolean;
  showGraph: boolean;
  searchMode: SearchMode;
  openInEditMode: boolean;
  vimMode: boolean;
  sidebarCollapsed: boolean;
  aiWrites: boolean;
  aiVaultOnly: boolean;
  aiProvider: AiProvider;
  aiModels: Partial<Record<AiProvider, string>>;
  aiKeys: Partial<Record<AiProvider, string>>;
};

export const DEFAULT_SETTINGS: Settings = {
  showBacklinks: true,
  showGraph: true,
  searchMode: "titles",
  openInEditMode: false,
  vimMode: false,
  sidebarCollapsed: false,
  aiWrites: true,
  aiVaultOnly: false,
  aiProvider: "anthropic",
  aiModels: {},
  aiKeys: {},
};

export const SETTINGS_STORAGE_KEY = "settings";

export const settingsStore = createPersistentStore(
  SETTINGS_STORAGE_KEY,
  DEFAULT_SETTINGS,
);

export const updateSettings = settingsStore.patch;
export const useSettings = settingsStore.use;

export function aiProviderOf(settings: Settings): AiProvider {
  return isAiProvider(settings.aiProvider)
    ? settings.aiProvider
    : DEFAULT_SETTINGS.aiProvider;
}

function record(
  value: Partial<Record<AiProvider, string>> | undefined,
  provider: AiProvider,
): string | null {
  const stored = value?.[provider];
  return typeof stored === "string" ? stored : null;
}

export function aiModelOf(settings: Settings, provider: AiProvider): string {
  return record(settings.aiModels, provider) || AI_DEFAULT_MODELS[provider];
}

export function aiKeyOf(settings: Settings, provider: AiProvider): string {
  return record(settings.aiKeys, provider) ?? "";
}

function patchRecord(
  current: Partial<Record<AiProvider, string>> | undefined,
  provider: AiProvider,
  value: string,
): Partial<Record<AiProvider, string>> {
  const next: Partial<Record<AiProvider, string>> = {};
  for (const known of AI_PROVIDERS) {
    const kept = record(current, known);
    if (kept !== null) next[known] = kept;
  }
  next[provider] = value;
  return next;
}

export function setAiModel(provider: AiProvider, model: string): void {
  const settings = settingsStore.get();
  settingsStore.patch({
    aiModels: patchRecord(settings.aiModels, provider, model),
  });
}

export function setAiKey(provider: AiProvider, key: string): void {
  const settings = settingsStore.get();
  settingsStore.patch({
    aiKeys: patchRecord(settings.aiKeys, provider, key),
  });
}

export function aiCredentials(settings: Settings) {
  const provider = aiProviderOf(settings);
  return {
    provider,
    model: aiModelOf(settings, provider),
    apiKey: aiKeyOf(settings, provider),
  };
}
