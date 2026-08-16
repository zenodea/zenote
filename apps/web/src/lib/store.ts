"use client";

import { useSyncExternalStore } from "react";

export type Store<T> = {
  get: () => T;
  set: (next: T) => void;
  patch: (part: Partial<T>) => void;
  use: () => T;
};

export function createStore<T>(initial: T, snapshot: T = initial): Store<T> {
  const listeners = new Set<() => void>();
  let current = initial;

  const subscribe = (onChange: () => void) => {
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  };

  const store: Store<T> = {
    get: () => current,
    set: (next) => {
      current = next;
      for (const listener of listeners) listener();
    },
    patch: (part) => store.set({ ...current, ...part }),
    use: () => useSyncExternalStore(subscribe, store.get, () => snapshot),
  };

  return store;
}

export function createPersistentStore<T extends object>(
  key: string,
  defaults: T,
): Store<T> {
  const base = createStore(defaults);
  let loaded = false;

  // Asked about rather than caught: Node ships an experimental localStorage of
  // its own, so touching it while rendering on the server no longer throws —
  // it warns, once per boot, and the catch below never sees it.
  const stored = typeof window !== "undefined";

  function readStored(): T {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return { ...defaults, ...JSON.parse(raw) };
    } catch {}
    return defaults;
  }

  const store: Store<T> = {
    get: () => {
      if (!loaded && stored) {
        loaded = true;
        base.set(readStored());
      }
      return base.get();
    },
    set: (next) => {
      loaded = true;
      if (stored) {
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {}
      }
      base.set(next);
    },
    patch: (part) => store.set({ ...store.get(), ...part }),
    use: () => {
      base.use();
      return store.get();
    },
  };

  return store;
}
