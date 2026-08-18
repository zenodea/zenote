"use client";

import { createStore } from "../store";

const switcher = createStore(false);

export const useSwitcherOpen = switcher.use;
export const openSwitcher = () => switcher.set(true);
export const closeSwitcher = () => switcher.set(false);
export const toggleSwitcher = () => switcher.set(!switcher.get());

const find = createStore(0);

export const useFindRequest = find.use;
export const requestFind = () => find.set(find.get() + 1);
