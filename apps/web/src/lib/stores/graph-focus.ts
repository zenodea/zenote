"use client";

import { createStore } from "../store";

/** Who last aimed the graph: the assistant citing its sources, or the reader. */
export type Focus = { slugs: string[]; from: "reader" | "assistant" };

const store = createStore<Focus>({ slugs: [], from: "reader" });

export const useGraphFocusState = store.use;
export const useGraphFocus = () => store.use().slugs;

/** Takes a value or an updater, so it stands in for a setState of the same shape. */
export function setGraphFocus(
  next: string[] | ((current: string[]) => string[]),
  from: Focus["from"] = "reader",
) {
  const current = store.get().slugs;
  store.set({
    slugs: typeof next === "function" ? next(current) : next,
    from,
  });
}
