"use client";

import { useEffect } from "react";
import { useLatestRef } from "./use-latest-ref";

type Combo = `mod+${string}` | `${string}`;

function matches(event: KeyboardEvent, combo: Combo): boolean {
  const wantsMod = combo.startsWith("mod+");
  const key = wantsMod ? combo.slice(4) : combo;

  if (wantsMod !== (event.metaKey || event.ctrlKey)) return false;
  return event.key.toLowerCase() === key.toLowerCase();
}

export function useHotkey(
  combo: Combo,
  handler: (event: KeyboardEvent) => void,
  enabled = true,
) {
  const latest = useLatestRef(handler);

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (matches(event, combo)) latest.current(event);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [combo, enabled, latest]);
}

export function useEscape(handler: () => void, enabled = true) {
  useHotkey("Escape", handler, enabled);
}
