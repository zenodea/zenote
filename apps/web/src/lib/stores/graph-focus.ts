"use client";

import { createStore } from "../store";

// Slugs rather than indices: the assistant names notes, and a rebuilt graph renumbers them.
const store = createStore<string[]>([]);

export const useGraphFocus = store.use;

/** Takes a value or an updater, so it stands in for a setState of the same shape. */
export function setGraphFocus(
  next: string[] | ((current: string[]) => string[]),
) {
  store.set(typeof next === "function" ? next(store.get()) : next);
}
