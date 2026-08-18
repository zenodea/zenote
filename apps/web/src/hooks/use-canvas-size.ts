"use client";

import { useEffect, useState, type RefObject } from "react";
import { useLatestRef } from "./use-latest-ref";

export type Size = { width: number; height: number };

export function useCanvasSize({
  canvasRef,
  sizeRef,
  onResize,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  sizeRef: RefObject<Size>;
  onResize: (size: Size, rect: DOMRect) => void;
}) {
  const [ready, setReady] = useState(false);
  const latest = useLatestRef(onResize);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const measure = () => {
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      const previous = sizeRef.current;
      if (width === previous.width && height === previous.height) return;

      sizeRef.current = { width, height };
      if (width > 0 && height > 0) setReady(true);
      latest.current(sizeRef.current, canvas.getBoundingClientRect());
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [canvasRef, sizeRef, latest]);

  return ready;
}
