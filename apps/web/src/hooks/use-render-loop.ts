"use client";

import { useCallback, useEffect, useRef } from "react";
import { useLatestRef } from "./use-latest-ref";

export function useRenderLoop(tick: () => boolean) {
  const latest = useLatestRef(tick);
  const frame = useRef(0);
  const running = useRef(false);

  const start = useCallback(() => {
    if (running.current) return;
    running.current = true;

    const run = () => {
      if (!latest.current()) {
        running.current = false;
        return;
      }
      frame.current = requestAnimationFrame(run);
    };

    frame.current = requestAnimationFrame(run);
  }, [latest]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      running.current = false;
    },
    [],
  );

  return start;
}
