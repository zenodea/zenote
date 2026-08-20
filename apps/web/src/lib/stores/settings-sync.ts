"use client";

import { loadSettings, saveSettings } from "@/app/actions/settings";
import { DEFAULT_SETTINGS, settingsStore, type Settings } from "./settings";

const PUSH_DELAY_MS = 1500;

const DEVICE_KEYS = new Set<keyof Settings>(["sidebarCollapsed"]);

function shared(settings: Settings): Partial<Settings> {
  const copy = { ...settings } as Record<string, unknown>;
  for (const key of DEVICE_KEYS) delete copy[key];
  return copy as Partial<Settings>;
}

let watching = false;

export async function startSettingsSync(): Promise<void> {
  const remote = await loadSettings().catch(() => null);

  if (remote) {
    const known = {} as Record<string, unknown>;
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
      if (DEVICE_KEYS.has(key)) continue;
      if (typeof remote[key] === typeof DEFAULT_SETTINGS[key]) {
        known[key] = remote[key];
      }
    }
    settingsStore.patch(known as Partial<Settings>);
  }

  if (watching) return;
  watching = true;

  let last = JSON.stringify(shared(settingsStore.get()));
  let timer: ReturnType<typeof setTimeout> | null = null;

  settingsStore.subscribe(() => {
    const next = shared(settingsStore.get());
    const json = JSON.stringify(next);
    if (json === last) return;
    last = json;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void saveSettings(next as Record<string, unknown>).catch(() => {});
    }, PUSH_DELAY_MS);
  });
}
