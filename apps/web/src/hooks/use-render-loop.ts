"use client";

import { useCallback, useEffect, useRef } from "react";
import { useLatestRef } from "./use-latest-ref";

export function useRenderLoop(tick: () => boolean) {
  const latest = useLatestRef(tick);
  const frame = useRef(0);
  const running = useRef(false);
  const paused = useRef(false);

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

  useEffect(() => {
    function onVisibility() {
      if (document.hidden) {
        if (!running.current) return;
        cancelAnimationFrame(frame.current);
        running.current = false;
        paused.current = true;
      } else if (paused.current) {
        paused.current = false;
        start();
      }
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [start]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      running.current = false;
    },
    [],
  );

  return start;
}
