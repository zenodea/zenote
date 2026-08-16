"use client";

import { useEffect } from "react";
import { createStore } from "../store";

const waits = createStore(0);
const showing = createStore(false);

/** Release is deferred a tick: fallback and page swap in one commit, and a dip to zero would restart. */
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

/** Whether the mark is on screen: covers hold until it is gone, so the two lift together. */
export const useRouteLoaderShowing = () => showing.use();
export const setRouteLoaderShowing = showing.set;
