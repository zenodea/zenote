"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  AXIS,
  IDLE_MS,
  createScrollPhysics,
  type Axis,
} from "@/lib/scroller-physics";

export function useScrollThumb(
  axis: Axis,
  scrollRef?: { current: HTMLDivElement | null },
) {
  const box = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLDivElement | null>(null);
  const thumb = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLSpanElement>(null);
  const dragging = useRef(false);
  const wake = useRef(() => {});
  const idle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ops = AXIS[axis];

  const attachArea = useCallback(
    (node: HTMLDivElement | null) => {
      area.current = node;
      if (scrollRef) scrollRef.current = node;
    },
    [scrollRef],
  );

  const flash = useCallback(() => {
    const frame = box.current;
    if (!frame) return;
    frame.dataset.active = "";
    clearTimeout(idle.current);
    idle.current = setTimeout(() => {
      if (!dragging.current) delete frame.dataset.active;
    }, IDLE_MS);
  }, []);

  useEffect(() => {
    const element = area.current;
    const bar = thumb.current;
    const line = mark.current;
    const frame = box.current;
    if (!element || !bar || !line || !frame) return;

    const physics = createScrollPhysics({
      area: element,
      thumb: bar,
      mark: line,
      frame,
      axis,
      isDragging: () => dragging.current,
    });
    const start = physics.start;
    wake.current = start;

    const resize = new ResizeObserver(start);
    resize.observe(element);
    const mutation = new MutationObserver(start);
    mutation.observe(element, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    element.addEventListener("scroll", start);
    start();

    return () => {
      physics.stop();
      clearTimeout(idle.current);
      resize.disconnect();
      mutation.disconnect();
      element.removeEventListener("scroll", start);
    };
  }, [axis]);

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    const element = area.current;
    const bar = thumb.current;
    const frame = box.current;
    if (!element || !bar || !frame) return;

    event.preventDefault();
    const grabbedAt = ops.point(event);
    const from = ops.at(element);
    const view = ops.view(element);
    const travel = view - ops.thumbLength(bar);
    const range = ops.span(element) - view;
    if (travel <= 0) return;

    dragging.current = true;
    frame.dataset.dragging = "";
    bar.setPointerCapture(event.pointerId);
    wake.current();

    const move = (moveEvent: PointerEvent) => {
      ops.scrollTo(
        element,
        from + ((ops.point(moveEvent) - grabbedAt) / travel) * range,
      );
    };
    const stop = () => {
      dragging.current = false;
      delete frame.dataset.dragging;
      bar.releasePointerCapture(event.pointerId);
      bar.removeEventListener("pointermove", move);
      bar.removeEventListener("pointerup", stop);
      bar.removeEventListener("pointercancel", stop);
      flash();
    };
    bar.addEventListener("pointermove", move);
    bar.addEventListener("pointerup", stop);
    bar.addEventListener("pointercancel", stop);
  }

  function onThumbWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.stopPropagation();
    const element = area.current;
    if (!element) return;
    ops.scrollTo(element, ops.at(element) + ops.wheelDelta(event));
  }

  return { box, attachArea, thumb, mark, flash, startDrag, onThumbWheel };
}
