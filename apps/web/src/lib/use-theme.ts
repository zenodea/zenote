"use client";

import { useSyncExternalStore } from "react";
import { isThemeId, subscribeToTheme, type ThemeId } from "./theme";

function getThemeSnapshot(): ThemeId {
  const current = document.documentElement.dataset.theme;
  return current && isThemeId(current) ? current : "default-light";
}

/** The active theme id, re-rendering on change. */
export function useThemeId(): ThemeId {
  return useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    () => "default-light",
  );
}
