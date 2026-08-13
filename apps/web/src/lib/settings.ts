"use client";

import { useSyncExternalStore } from "react";

/**
 * User settings, stored as a single JSON blob so the shape can later move to a
 * per-user column in the database unchanged. localStorage is the only backend
 * for now; reads merge over defaults so new fields are backwards-compatible.
 */
export type Settings = {
  showBacklinks: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  showBacklinks: true,
};

export const SETTINGS_STORAGE_KEY = "settings";

const listeners = new Set<() => void>();

// Cached so getSnapshot returns a stable reference between changes.
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
