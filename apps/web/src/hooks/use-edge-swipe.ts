"use client";

import { useEffect } from "react";
import { useLatestRef } from "./use-latest-ref";

const EDGE = 24;
const DISTANCE = 48;

/** Drags from the screen's left edge open the drawer; drags left across it close it. */
export function useEdgeSwipe(
  enabled: boolean,
  open: boolean,
  onOpen: () => void,
  onClose: () => void,
) {
  const latest = useLatestRef({ open, onOpen, onClose });

  useEffect(() => {
    if (!enabled) return;

    let start: { x: number; y: number } | null = null;

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === "mouse") return;
      const { open: isOpen } = latest.current;
      if (!isOpen && event.clientX > EDGE) return;
      start = { x: event.clientX, y: event.clientY };
    }

    function onPointerMove(event: PointerEvent) {
      if (!start) return;

      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      // A mostly-vertical drag is the page scrolling, not a drawer gesture.
      if (Math.abs(dy) > Math.abs(dx)) {
        start = null;
        return;
      }
      if (Math.abs(dx) < DISTANCE) return;

      const { open: isOpen, onOpen: opener, onClose: closer } = latest.current;
      start = null;
      if (dx > 0 && !isOpen) opener();
      if (dx < 0 && isOpen) closer();
    }

    function onPointerUp() {
      start = null;
    }

    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerup", onPointerUp, { passive: true });
    document.addEventListener("pointercancel", onPointerUp, { passive: true });

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
    };
  }, [enabled, latest]);
}
