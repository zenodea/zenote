/**
 * Colour themes, as dark/light pairs. Each id matches a
 * `[data-theme="..."]` block in globals.css that defines the full token
 * set (--background, --foreground, --accent); everything else derives from
 * those, so a new theme is one CSS block there and one family entry here.
 */
export const THEME_FAMILIES = [
  { name: "Default", dark: "default-dark", light: "default-light" },
  { name: "Dracula", dark: "dracula-dark", light: "dracula-light" },
  { name: "Tokyo Night", dark: "tokyo-night-dark", light: "tokyo-night-light" },
  { name: "Gruvbox", dark: "gruvbox-dark", light: "gruvbox-light" },
  { name: "Everforest", dark: "everforest-dark", light: "everforest-light" },
  { name: "Catppuccin", dark: "catppuccin-dark", light: "catppuccin-light" },
] as const;

export type ThemeId =
  | (typeof THEME_FAMILIES)[number]["dark"]
  | (typeof THEME_FAMILIES)[number]["light"];

export const THEME_IDS: readonly ThemeId[] = THEME_FAMILIES.flatMap(
  (family) => [family.dark, family.light],
);

export const THEME_STORAGE_KEY = "theme";

export function isThemeId(value: string): value is ThemeId {
  return (THEME_IDS as readonly string[]).includes(value);
}

/** Applies and persists a theme. Client-side only. */
export function applyTheme(next: ThemeId) {
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Private browsing: the choice just won't persist.
  }
}
