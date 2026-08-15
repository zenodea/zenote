"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_THEME,
  isThemeId,
  subscribeToTheme,
  type ThemeId,
} from "./theme";

function getThemeSnapshot(): ThemeId {
  const current = document.documentElement.dataset.theme;
  return current && isThemeId(current) ? current : DEFAULT_THEME;
}

export function useThemeId(): ThemeId {
  return useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    () => DEFAULT_THEME,
  );
}
