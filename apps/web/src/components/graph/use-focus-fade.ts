"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { useLatestRef } from "@/hooks/use-latest-ref";
import { neighbourhood } from "@/lib/graph/model";

const FADE = 0.18;

function refit(values: Float32Array, count: number, rest: number) {
  const next = new Float32Array(count).fill(rest);
  next.set(values.subarray(0, Math.min(values.length, count)));
  return next;
}

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
  const labelFocus = useRef<Float32Array>(new Float32Array(nodeCount));
  const hoverSet = useRef<{ node: number; set: Set<number> } | null>(null);
  const focusRef = useLatestRef(focus);

  useEffect(() => {
    if (highlight.current.length === nodeCount) return;
    highlight.current = refit(highlight.current, nodeCount, 1);
    labelFocus.current = refit(labelFocus.current, nodeCount, 0);
    hovered.current = null;
    hoverSet.current = null;
  }, [nodeCount]);

  const activeSet = useCallback(() => {
    if (focusRef.current) return focusRef.current;

    const hoverIndex = hovered.current;
    if (hoverIndex === null) return null;

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
    activeSet,
    setHovered,
    advanceFade,
  };
}
