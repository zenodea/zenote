"use client";

import { useSyncExternalStore } from "react";
import {
  THEME_FAMILIES,
  applyTheme,
  isThemeId,
  type ThemeId,
} from "@/lib/theme";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): ThemeId {
  const current = document.documentElement.dataset.theme;
  return current && isThemeId(current) ? current : "default-light";
}

function getServerSnapshot(): ThemeId {
  return "default-light";
}

export function ThemeSettings() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {THEME_FAMILIES.map((family) => {
        const active = theme === family.dark || theme === family.light;
        return (
          <div
            key={family.name}
            className={`overflow-hidden rounded-lg border ${
              active
                ? "border-accent ring-1 ring-accent"
                : "border-foreground/20 hover:border-foreground/50"
            }`}
          >
            <div className="flex">
              {[
                { id: family.dark, variant: "dark" },
                { id: family.light, variant: "light" },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  // Setting data-theme scopes the theme's tokens to this half,
                  // so the preview uses the real values from globals.css.
                  data-theme={option.id}
                  onClick={() => applyTheme(option.id)}
                  aria-label={`${family.name} ${option.variant}`}
                  aria-pressed={theme === option.id}
                  className="flex flex-1 items-center justify-center gap-1.5 bg-background py-2.5 text-foreground hover:opacity-75"
                >
                  <span aria-hidden className="text-sm font-semibold">
                    Aa
                  </span>
                  <span aria-hidden className="size-2 rounded-full bg-accent" />
                  {theme === option.id && (
                    <span aria-hidden className="text-xs text-accent">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-foreground/15 px-2 py-1 text-center text-xs font-medium opacity-70">
              {family.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
