"use client";

import { useSyncExternalStore } from "react";
import { measureGeometry, type Geometry } from "./frame";

export type Leaving = {
  active: boolean;
  geometry: Geometry | null;
  /**
   * Viewport height when `geometry` was captured. The footer seam is measured
   * from the bottom of the window, so a resize while signed out invalidates
   * it and Frame has to fall back to the constants.
   */
  viewportHeight: number;
};

const IDLE: Leaving = { active: false, geometry: null, viewportHeight: 0 };

const listeners = new Set<() => void>();

// Module state survives the soft navigation to /login, which is how Frame knows
// to run the opening sequence — and where it gets the real chrome's geometry,
// measured while the chrome was still on screen.
let state: Leaving = IDLE;

function emit() {
  for (const listener of listeners) listener();
}

export function startLeaving() {
  if (state.active) return;

  state = {
    active: true,
    geometry: measureGeometry(),
    viewportHeight: window.innerHeight,
  };
  document.body.dataset.leaving = "true";
  emit();
}

export function endLeaving() {
  if (!state.active) return;

  state = { ...state, active: false };
  delete document.body.dataset.leaving;
  emit();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function useLeaving(): Leaving {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => IDLE,
  );
}
