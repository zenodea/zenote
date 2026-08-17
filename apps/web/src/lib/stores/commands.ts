"use client";

import { createStore } from "../store";

/** The quick switcher outlives every route, so a plain flag is enough. */
const switcher = createStore(false);

export const useSwitcherOpen = switcher.use;
export const openSwitcher = () => switcher.set(true);
export const closeSwitcher = () => switcher.set(false);
export const toggleSwitcher = () => switcher.set(!switcher.get());

/** The find bar remounts per route, so it takes requests rather than a flag. */
const find = createStore(0);

export const useFindRequest = find.use;
export const requestFind = () => find.set(find.get() + 1);
