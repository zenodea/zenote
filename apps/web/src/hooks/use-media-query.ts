"use client";

import { useSyncExternalStore } from "react";

export type LayoutMode = "phone" | "tablet" | "desktop";

// Keep in step with the `md:`/`lg:` breakpoints the shell branches on.
export const PHONE_QUERY = "(max-width: 767px)";
export const TABLET_QUERY = "(min-width: 768px) and (max-width: 1023px)";
export const COARSE_QUERY = "(pointer: coarse)";

type MediaStore = {
  subscribe: (onChange: () => void) => () => void;
  get: () => boolean;
};

const stores = new Map<string, MediaStore>();

function mediaStore(query: string): MediaStore {
  const existing = stores.get(query);
  if (existing) return existing;

  let list: MediaQueryList | null = null;
  const resolve = () => (list ??= window.matchMedia(query));

  const store: MediaStore = {
    subscribe: (onChange) => {
      const target = resolve();
      target.addEventListener("change", onChange);
      return () => target.removeEventListener("change", onChange);
    },
    get: () => resolve().matches,
  };

  stores.set(query, store);
  return store;
}

export function useMediaQuery(query: string, server = false) {
  const store = mediaStore(query);
  return useSyncExternalStore(store.subscribe, store.get, () => server);
}

export function useLayoutMode(): LayoutMode {
  const phone = useMediaQuery(PHONE_QUERY);
  const tablet = useMediaQuery(TABLET_QUERY);
  return phone ? "phone" : tablet ? "tablet" : "desktop";
}

export function useCoarsePointer() {
  return useMediaQuery(COARSE_QUERY);
}
