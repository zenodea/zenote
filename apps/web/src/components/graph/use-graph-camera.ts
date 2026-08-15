"use client";

import { useCallback, useRef } from "react";
import { useLatestRef } from "@/hooks/use-latest-ref";
import type { Size } from "@/hooks/use-canvas-size";
import type { View } from "@/lib/graph/geometry";

const MIN_SCALE = 0.05;
const MAX_SCALE = 8;
const FIT_PADDING = 40;
const VIEW_EASE = 0.22;
const FRICTION = 0.88;
const MIN_VELOCITY = 0.08;

export const FIT_OVERSCAN = 2.2;

type Point = { x: number; y: number };
type Positions = { x: Float64Array; y: Float64Array };

export function useGraphCamera({
  layout,
  target,
  size,
  overscan,
}: {
  layout: Positions;
  /** The settled layout to frame on, or null while it is still being solved. */
  target: () => Positions | null;
  size: Size;
  overscan: number;
}) {
  const view = useRef<View>({ x: 0, y: 0, scale: 1 });
  const viewTarget = useRef<View>({ x: 0, y: 0, scale: 1 });
  const fitScale = useRef(1);
  const velocity = useRef({ x: 0, y: 0 });
  const pan = useRef<Point | null>(null);
  const adjusted = useRef(false);
  const latestSize = useLatestRef(size);

  const frameBounds = useCallback(
    (
      minX: number,
      maxX: number,
      minY: number,
      maxY: number,
      { overscan = 1, maxScale = MAX_SCALE } = {},
    ): View | null => {
      const { width, height } = latestSize.current;
      if (!width || !height) return null;

      const scale = Math.max(
        MIN_SCALE,
        Math.min(
          ((width - FIT_PADDING * 2) / Math.max(maxX - minX, 1)) * overscan,
          ((height - FIT_PADDING * 2) / Math.max(maxY - minY, 1)) * overscan,
          maxScale,
        ),
      );

      return {
        scale,
        x: width / 2 - ((minX + maxX) / 2) * scale,
        y: height / 2 - ((minY + maxY) / 2) * scale,
      };
    },
    [latestSize],
  );

  const fit = useCallback(
    (instant = false) => {
      const settled = target();
      if (!settled) return;
      const count = settled.x.length;
      if (!count) return;

      const xs = Float64Array.from(settled.x).sort();
      const ys = Float64Array.from(settled.y).sort();
      const low = Math.floor(count * 0.01);
      const high = Math.min(count - 1, Math.ceil(count * 0.99));

      const next = frameBounds(xs[low], xs[high], ys[low], ys[high], {
        overscan,
      });
      if (!next) return;

      fitScale.current = next.scale;
      viewTarget.current = next;
      velocity.current = { x: 0, y: 0 };
      if (instant) view.current = { ...next };
    },
    [target, overscan, frameBounds],
  );

  const frameNodes = useCallback(
    (indices: Iterable<number>) => {
      adjusted.current = true;

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const i of indices) {
        minX = Math.min(minX, layout.x[i]);
        maxX = Math.max(maxX, layout.x[i]);
        minY = Math.min(minY, layout.y[i]);
        maxY = Math.max(maxY, layout.y[i]);
      }

      // Capped so a tiny neighbourhood doesn't fill the screen.
      const next = frameBounds(minX, maxX, minY, maxY, {
        maxScale: Math.min(fitScale.current * 4, MAX_SCALE),
      });
      if (next) viewTarget.current = next;
      velocity.current = { x: 0, y: 0 };
    },
    [layout, frameBounds],
  );

  const zoomAt = useCallback((anchor: Point, factor: number) => {
    adjusted.current = true;

    // Anchored on the target so fast scrolls accumulate, not fight the ease.
    const current = viewTarget.current;
    const scale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, current.scale * factor),
    );

    viewTarget.current = {
      scale,
      x: anchor.x - ((anchor.x - current.x) / current.scale) * scale,
      y: anchor.y - ((anchor.y - current.y) / current.scale) * scale,
    };
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      const { width, height } = latestSize.current;
      zoomAt({ x: width / 2, y: height / 2 }, factor);
    },
    [zoomAt, latestSize],
  );

  const beginPan = useCallback((point: Point) => {
    pan.current = point;
    velocity.current = { x: 0, y: 0 };
    viewTarget.current = { ...view.current };
  }, []);

  const panTo = useCallback((point: Point) => {
    if (!pan.current) return;
    adjusted.current = true;

    const dx = point.x - pan.current.x;
    const dy = point.y - pan.current.y;
    const current = view.current;

    view.current = {
      scale: current.scale,
      x: current.x + dx,
      y: current.y + dy,
    };
    viewTarget.current = {
      scale: viewTarget.current.scale,
      x: viewTarget.current.x + dx,
      y: viewTarget.current.y + dy,
    };
    velocity.current = {
      x: velocity.current.x * 0.6 + dx * 0.4,
      y: velocity.current.y * 0.6 + dy * 0.4,
    };

    pan.current = point;
  }, []);

  const endPan = useCallback(() => {
    pan.current = null;
  }, []);

  // The camera stops auto-fitting for good once the user has moved it.
  const fitIfUntouched = useCallback(() => {
    if (!adjusted.current) fit(true);
  }, [fit]);

  const resetView = useCallback(() => {
    adjusted.current = false;
    fit();
  }, [fit]);

  const advanceView = useCallback(() => {
    const current = view.current;
    const goal = viewTarget.current;
    let moving = false;

    if (!pan.current) {
      const speed = Math.hypot(velocity.current.x, velocity.current.y);
      if (speed > MIN_VELOCITY) {
        goal.x += velocity.current.x;
        goal.y += velocity.current.y;
        velocity.current.x *= FRICTION;
        velocity.current.y *= FRICTION;
        moving = true;
      } else {
        velocity.current.x = 0;
        velocity.current.y = 0;
      }
    }

    const dx = goal.x - current.x;
    const dy = goal.y - current.y;
    if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
      current.x += dx * VIEW_EASE;
      current.y += dy * VIEW_EASE;
      moving = true;
    } else {
      current.x = goal.x;
      current.y = goal.y;
    }

    // Geometric: zoom is perceived multiplicatively; linear reads fast-then-crawling.
    const ratio = goal.scale / current.scale;
    if (Math.abs(Math.log(ratio)) > 0.0008) {
      current.scale *= Math.pow(ratio, VIEW_EASE);
      moving = true;
    } else {
      current.scale = goal.scale;
    }

    return moving;
  }, []);

  return {
    viewRef: view,
    fitScaleRef: fitScale,
    panningRef: pan,
    fitIfUntouched,
    resetView,
    frameNodes,
    zoomAt,
    zoomBy,
    beginPan,
    panTo,
    endPan,
    advanceView,
  };
}
