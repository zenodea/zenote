"use client";

import { createStore } from "../store";

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "conflict";

/**
 * A save against a warm connection lands in well under a frame's worth of
 * reading time. Held so that saving is something you see happen rather than a
 * word that blinks; the outcome waits its turn behind it.
 */
const MIN_SAVING_MS = 500;

const store = createStore<SaveStatus>("idle");

export const useSaveStatus = store.use;

let savingSince = 0;
let held: ReturnType<typeof setTimeout> | null = null;

export function setSaveStatus(next: SaveStatus) {
  if (held) clearTimeout(held);
  held = null;

  if (next === "saving") {
    savingSince = performance.now();
    store.set(next);
    return;
  }

  const remaining =
    store.get() === "saving"
      ? MIN_SAVING_MS - (performance.now() - savingSince)
      : 0;

  if (remaining <= 0) {
    store.set(next);
    return;
  }

  held = setTimeout(() => {
    held = null;
    store.set(next);
  }, remaining);
}
