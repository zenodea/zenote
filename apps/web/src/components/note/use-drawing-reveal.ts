"use client";

import { useEffect, useState } from "react";

const FALLBACK_MS = 1200;

export function useDrawingReveal(mounted: boolean, painted: boolean): boolean {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    const timer = setTimeout(() => setRevealed(true), FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [mounted]);

  useEffect(() => {
    if (!painted) return;

    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setRevealed(true));
    });

    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [painted]);

  return revealed;
}
