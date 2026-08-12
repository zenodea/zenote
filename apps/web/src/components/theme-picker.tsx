"use client";

import { useSyncExternalStore } from "react";
import { Dropdown } from "@/components/dropdown";
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

export function ThemePicker() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <Dropdown
      direction="up"
      align="center"
      ariaLabel="Colour theme"
      label={
        <span
          aria-hidden
          className="my-0.5 block size-3.5 rounded-full border border-foreground/30"
          style={{
            background:
              "linear-gradient(135deg, var(--background) 50%, var(--accent) 50%)",
          }}
        />
      }
    >
      {THEME_FAMILIES.map((family) => (
        <div
          key={family.name}
          className="flex items-center gap-1 rounded px-2 py-1 hover:bg-foreground/10"
        >
          <button
            type="button"
            onClick={() => applyTheme(family.dark)}
            className={`flex-1 text-left ${
              theme === family.dark ? "font-medium text-accent" : ""
            }`}
          >
            {family.name}
          </button>
          <span aria-hidden className="opacity-30">
            |
          </span>
          <button
            type="button"
            onClick={() => applyTheme(family.light)}
            aria-label={`${family.name} light`}
            title={`${family.name} light`}
            className={`flex items-center justify-center px-1 ${
              theme === family.light
                ? "font-medium text-accent"
                : "opacity-50 hover:opacity-100"
            }`}
          >
            {/* The asterisk glyph sits high in the em box; nudge to centre. */}
            <span className="translate-y-[0.12em]">*</span>
          </button>
        </div>
      ))}
    </Dropdown>
  );
}
