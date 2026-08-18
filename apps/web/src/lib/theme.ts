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

export const DEFAULT_THEME: ThemeId = "default-light";
export const DEFAULT_DARK_THEME: ThemeId = "default-dark";

export function isThemeId(value: string): value is ThemeId {
  return (THEME_IDS as readonly string[]).includes(value);
}

export function subscribeToTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

export function applyTheme(next: ThemeId) {
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {}
}
