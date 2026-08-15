"use client";

import { useCallback, useRef, type RefObject } from "react";
import { useLatestRef } from "@/hooks/use-latest-ref";
import { neighbourhood } from "@/lib/graph/model";

const FADE = 0.18;

export function useFocusFade({
  nodeCount,
  neighbours,
  focus,
  canvasRef,
}: {
  nodeCount: number;
  neighbours: number[][];
  focus: Set<number> | null;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}) {
  const hovered = useRef<number | null>(null);
  const highlight = useRef<Float32Array>(new Float32Array(nodeCount).fill(1));
  const focusAmount = useRef(0);
  // Rests at 0 (highlight rests at 1); multiplying them makes labels flash.
  const labelFocus = useRef<Float32Array>(new Float32Array(nodeCount));
  const hoverSet = useRef<{ node: number; set: Set<number> } | null>(null);
  const focusRef = useLatestRef(focus);

  const activeSet = useCallback(() => {
    if (focusRef.current) return focusRef.current;

    const hoverIndex = hovered.current;
    if (hoverIndex === null) return null;

    // Cached: runs every frame during a fade.
    if (hoverSet.current?.node !== hoverIndex) {
      hoverSet.current = {
        node: hoverIndex,
        set: neighbourhood(neighbours, [hoverIndex], 1),
      };
    }
    return hoverSet.current.set;
  }, [neighbours, focusRef]);

  const setHovered = useCallback(
    (node: number | null) => {
      hovered.current = node;
      if (canvasRef.current) {
        canvasRef.current.style.cursor = node === null ? "grab" : "pointer";
      }
    },
    [canvasRef],
  );

  const advanceFade = useCallback(() => {
    const near = activeSet();
    const values = highlight.current;
    const labels = labelFocus.current;
    let moving = false;

    const ease = (value: number, target: number) => {
      if (Math.abs(target - value) < 0.004) return target;
      moving = true;
      return value + (target - value) * FADE;
    };

    for (let i = 0; i < values.length; i++) {
      const inFocus = near !== null && near.has(i);
      values[i] = ease(values[i], near === null || inFocus ? 1 : 0);
      labels[i] = ease(labels[i], inFocus ? 1 : 0);
    }
    focusAmount.current = ease(focusAmount.current, near === null ? 0 : 1);

    return moving;
  }, [activeSet]);

  return {
    hoveredRef: hovered,
    highlightRef: highlight,
    labelFocusRef: labelFocus,
    focusAmountRef: focusAmount,
    setHovered,
    advanceFade,
  };
}
