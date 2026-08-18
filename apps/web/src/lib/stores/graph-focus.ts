"use client";

import { createStore } from "../store";

export type Focus = { slugs: string[]; from: "reader" | "assistant" };

const store = createStore<Focus>({ slugs: [], from: "reader" });

export const useGraphFocusState = store.use;
export const useGraphFocus = () => store.use().slugs;

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
