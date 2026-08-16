"use client";

import { useEffect } from "react";
import { createStore } from "../store";

/** How long the mark takes to dim away once its work is done. */
export const LOADER_FADE_MS = 200;

const waits = createStore(0);
const showing = createStore(false);
const marked = createStore(false);

/**
 * Holds the route loader open while this component is waiting.
 *
 * The release is deferred a tick so a handover never dips to zero: the route
 * fallback unmounts and the page it was standing in for mounts in the same
 * commit, and a loader that saw the gap between them would restart.
 */
export function useRouteWait(waiting: boolean) {
  useEffect(() => {
    if (!waiting) return;

    waits.set(waits.get() + 1);
    return () => {
      setTimeout(() => waits.set(waits.get() - 1), 0);
    };
  }, [waiting]);
}

export const useRouteWaiting = () => waits.use() > 0;

/**
 * Whether the mark is on screen. A cover that hides its own loading holds
 * until this goes false, so the two lift together rather than one under the other.
 */
export const useRouteLoaderShowing = () => showing.use();

/** Whether the mark is mounted: through the fade, a beat longer than it is lit. */
export const useRouteLoaderMarked = () => marked.use();

let fade: ReturnType<typeof setTimeout> | null = null;

export function setRouteLoaderShowing(next: boolean) {
  showing.set(next);

  if (fade) clearTimeout(fade);
  fade = null;

  if (next) marked.set(true);
  else if (marked.get())
    fade = setTimeout(() => marked.set(false), LOADER_FADE_MS);
}
