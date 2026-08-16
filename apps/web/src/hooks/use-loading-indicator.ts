"use client";

import { useEffect, useRef, useState } from "react";
import { LOADER_GRACE_MS } from "@/components/ui/DiamondLoader";

/**
 * Once shown, a loader stays this long. Short enough not to be felt as a
 * stall, long enough that it never reads as a glitch.
 */
const MIN_VISIBLE_MS = 400;

/**
 * Whether `loading` has gone on long enough to deserve an indicator, and has
 * shown one for long enough to take it away. A fixed minimum delay would tax
 * every fast load to protect the slow ones; this taxes neither.
 */
export function useLoadingIndicator(loading: boolean): boolean {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (!loading || visible) return;

    const id = setTimeout(() => {
      shownAt.current = performance.now();
      setVisible(true);
    }, LOADER_GRACE_MS);
    return () => clearTimeout(id);
  }, [loading, visible]);

  useEffect(() => {
    if (loading || !visible) return;

    const remaining = MIN_VISIBLE_MS - (performance.now() - shownAt.current);
    if (remaining <= 0) {
      setVisible(false);
      return;
    }

    const id = setTimeout(() => setVisible(false), remaining);
    return () => clearTimeout(id);
  }, [loading, visible]);

  return visible;
}
