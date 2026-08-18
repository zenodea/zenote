"use client";

import { useEffect } from "react";
import { createStore } from "../store";

const waits = createStore(0);
const showing = createStore(false);

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

export const useRouteLoaderShowing = () => showing.use();
export const setRouteLoaderShowing = showing.set;
