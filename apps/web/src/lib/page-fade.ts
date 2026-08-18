"use client";

import { createStore } from "./store";

const FAILSAFE_MS = 1500;

const store = createStore(false);

export const usePageFading = store.use;

let failsafe: ReturnType<typeof setTimeout> | null = null;

export function beginPageFade() {
  if (store.get()) return;
  store.set(true);
  failsafe = setTimeout(endPageFade, FAILSAFE_MS);
}

export function endPageFade() {
  if (failsafe) clearTimeout(failsafe);
  failsafe = null;
  if (store.get()) store.set(false);
}

export function navigatesAway(event: MouseEvent): boolean {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return false;

  const target = event.target;
  if (!(target instanceof Element)) return false;

  const anchor = target.closest("a");
  if (!(anchor instanceof HTMLAnchorElement) || !anchor.hasAttribute("href"))
    return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  if (anchor.origin !== window.location.origin) return false;

  return (
    anchor.pathname !== window.location.pathname ||
    anchor.search !== window.location.search
  );
}
