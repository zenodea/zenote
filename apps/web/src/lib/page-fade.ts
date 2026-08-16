"use client";

import { createStore } from "./store";

// A navigation that never lands must not strand the page invisible.
const FAILSAFE_MS = 1500;

const store = createStore(false);

export const usePageFading = store.use;

let failsafe: ReturnType<typeof setTimeout> | null = null;

/** Start the outgoing fade. Safe to call before a navigation that may not happen. */
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

/** A plain click on an in-app link that the router will turn into a navigation. */
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

  // Same-page links (and bare #hashes) swap nothing, so fading them reads as a flicker.
  return (
    anchor.pathname !== window.location.pathname ||
    anchor.search !== window.location.search
  );
}
