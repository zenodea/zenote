"use client";

import { useEffect, useRef, useState } from "react";

export const LOADER_GRACE_MS = 130;

const MIN_VISIBLE_MS = 400;

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
