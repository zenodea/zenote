"use client";

import { THEME_FAMILIES, applyTheme } from "@/lib/theme";
import { useThemeId } from "@/lib/use-theme";

export function ThemeSettings() {
  const theme = useThemeId();

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
