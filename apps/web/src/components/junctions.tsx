"use client";

import { useEffect, useState } from "react";
import { Diamond } from "@/components/diamond";

type Point = { x: number; y: number };

const EPSILON = 1.5;

function computeJunctions(): Point[] {
  const seams = document.querySelectorAll<HTMLElement>("[data-seam]");
  const horizontal: { y: number; x1: number; x2: number }[] = [];
  const vertical: { x: number; y1: number; y2: number }[] = [];

  for (const element of seams) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;

    switch (element.dataset.seam) {
      case "top":
        horizontal.push({ y: rect.top + 0.5, x1: rect.left, x2: rect.right });
        break;
      case "bottom":
        horizontal.push({
          y: rect.bottom - 0.5,
          x1: rect.left,
          x2: rect.right,
        });
        break;
      case "left":
        vertical.push({ x: rect.left + 0.5, y1: rect.top, y2: rect.bottom });
        break;
      case "right":
        vertical.push({ x: rect.right - 0.5, y1: rect.top, y2: rect.bottom });
        break;
    }
  }

  const points = new Map<string, Point>();
  for (const h of horizontal) {
    for (const v of vertical) {
      if (v.x < h.x1 - EPSILON || v.x > h.x2 + EPSILON) continue;
      if (h.y < v.y1 - EPSILON || h.y > v.y2 + EPSILON) continue;
      points.set(`${Math.round(v.x)}:${Math.round(h.y)}`, { x: v.x, y: h.y });
    }
  }
  return [...points.values()];
}

export function Junctions() {
  const [points, setPoints] = useState<Point[]>([]);

  useEffect(() => {
    let frame = 0;
    let activeTransitions = 0;

    function measure() {
      setPoints((previous) => {
        const next = computeJunctions();
        const same =
          previous.length === next.length &&
          previous.every((p, i) => p.x === next[i].x && p.y === next[i].y);
        return same ? previous : next;
      });
    }

    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    }

    function tick() {
      measure();
      if (activeTransitions > 0) frame = requestAnimationFrame(tick);
    }
    function onTransitionStart() {
      activeTransitions += 1;
      if (activeTransitions === 1) frame = requestAnimationFrame(tick);
    }
    function onTransitionEnd() {
      activeTransitions = Math.max(0, activeTransitions - 1);
      schedule();
    }

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "data-seam"],
    });
    window.addEventListener("resize", schedule);
    document.addEventListener("transitionstart", onTransitionStart, true);
    document.addEventListener("transitionend", onTransitionEnd, true);
    document.addEventListener("transitioncancel", onTransitionEnd, true);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      document.removeEventListener("transitionstart", onTransitionStart, true);
      document.removeEventListener("transitionend", onTransitionEnd, true);
      document.removeEventListener("transitioncancel", onTransitionEnd, true);
    };
  }, []);

  return points.map((point) => (
    <Diamond
      key={`${point.x}:${point.y}`}
      style={{ left: point.x, top: point.y }}
    />
  ));
}
