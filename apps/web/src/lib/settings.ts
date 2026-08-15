"use client";

import { useSyncExternalStore } from "react";
import type { SearchMode } from "./search";

export type Settings = {
  showBacklinks: boolean;
  showGraph: boolean;
  searchMode: SearchMode;
  openInEditMode: boolean;
  vimMode: boolean;
  sidebarCollapsed: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  showBacklinks: true,
  showGraph: true,
  searchMode: "titles",
  openInEditMode: false,
  vimMode: false,
  sidebarCollapsed: false,
};

export const SETTINGS_STORAGE_KEY = "settings";

const listeners = new Set<() => void>();

let cached: Settings | null = null;

function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // Corrupt blob or private browsing: fall back to defaults.
  }
  return DEFAULT_SETTINGS;
}

function getSettings(): Settings {
  cached ??= readSettings();
  return cached;
}

export function updateSettings(patch: Partial<Settings>) {
  cached = { ...getSettings(), ...patch };
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(cached));
  } catch {
    // Private browsing: the change just won't persist.
  }
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, () => DEFAULT_SETTINGS);
}
