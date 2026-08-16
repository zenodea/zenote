"use client";

import { createPersistentStore } from "../store";
import type { SearchMode } from "../search";

export type Settings = {
  showBacklinks: boolean;
  showGraph: boolean;
  searchMode: SearchMode;
  openInEditMode: boolean;
  vimMode: boolean;
  sidebarCollapsed: boolean;
  aiWrites: boolean;
  aiVaultOnly: boolean;
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
};

export const SETTINGS_STORAGE_KEY = "settings";

const store = createPersistentStore(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);

export const updateSettings = store.patch;
export const useSettings = store.use;
