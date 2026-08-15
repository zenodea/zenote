"use client";

import { useEffect, useRef, useState } from "react";

export type Size = { width: number; height: number };

/** Tracks the pixel size of a canvas's parent element. */
export function useCanvasSize() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const parent = canvasRef.current?.parentElement;
    if (!parent) return;

    const resize = () => {
      setSize({ width: parent.clientWidth, height: parent.clientHeight });
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  return { canvasRef, size };
}
