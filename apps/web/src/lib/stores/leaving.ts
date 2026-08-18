"use client";

import { createStore } from "../store";
import { measureGeometry, type Geometry } from "../frame";

export type Leaving = {
  active: boolean;
  geometry: Geometry | null;
  viewportHeight: number;
};

const IDLE: Leaving = { active: false, geometry: null, viewportHeight: 0 };

const store = createStore(IDLE);

export const useLeaving = store.use;

export function startLeaving() {
  if (store.get().active) return;

  store.set({
    active: true,
    geometry: measureGeometry(),
    viewportHeight: window.innerHeight,
  });
  document.body.dataset.leaving = "true";
}

export function endLeaving() {
  if (!store.get().active) return;

  store.patch({ active: false });
  delete document.body.dataset.leaving;
}
