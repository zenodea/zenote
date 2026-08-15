"use client";

import { useCallback, useEffect, useRef, type ComponentProps } from "react";

const MIN_THUMB = 24;
const IDLE_MS = 700;
const STRETCH_RATIO = 0.5;
const MAX_STRETCH = 32;
const SPEED_FULL = 30;
const MAX_SQUASH = 0.45;
const FADE = 38;
const RELEASE = 0.12;

type ScrollerProps = Omit<ComponentProps<"div">, "ref"> & {
  contentClassName?: string;
  scrollRef?: { current: HTMLDivElement | null };
};

export function Scroller({
  className = "",
  contentClassName = "",
  scrollRef,
  children,
  onScroll,
  ...rest
}: ScrollerProps) {
  const box = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLDivElement | null>(null);
  const thumb = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLSpanElement>(null);
  const dragging = useRef(false);
  const wake = useRef(() => {});
  const idle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const attach = useCallback(
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

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let request = 0;
    let velocity = 0;
    let peak = 0;
    let stretch = 0;
    let squash = 0;
    let shown = element.scrollTop;
    let previousTop = element.scrollTop;
    let previousSpeed = 0;
    let wasPinned = true;
    let quiet = 0;
    let lastBase = -1;
    let lastPaint = "";

    function paint() {
      if (!element || !bar || !line || !frame) return;
      const range = element.scrollHeight - element.clientHeight;
      if (range < 1) {
        delete frame.dataset.scrollable;
        request = 0;
        return;
      }
      frame.dataset.scrollable = "";

      const delta = element.scrollTop - previousTop;
      previousTop = element.scrollTop;

      velocity = velocity * 0.7 + delta * 0.3;
      const speed = Math.abs(velocity);
      peak = Math.max(speed, peak * 0.92);

      const pinned =
        element.scrollTop <= 0.5 || element.scrollTop >= range - 0.5;
      if (!still && pinned && !wasPinned && previousSpeed > 2) {
        squash = Math.min(
          MAX_SQUASH,
          squash + Math.min(previousSpeed / 45, 1) * MAX_SQUASH,
        );
        stretch = 0;
        velocity = 0;
        peak = 0;
      }
      wasPinned = pinned;
      previousSpeed = speed;

      squash *= 0.86;
      if (squash < 0.002) squash = 0;

      const base = Math.max(
        (element.clientHeight / element.scrollHeight) * element.clientHeight,
        MIN_THUMB,
      );

      const ceiling = Math.min(base * STRETCH_RATIO, MAX_STRETCH);
      const target =
        still || dragging.current
          ? 0
          : ceiling * Math.min(peak / SPEED_FULL, 1);
      stretch += (target - stretch) * 0.2;
      if (still || dragging.current) {
        shown = element.scrollTop;
      } else {
        shown += (element.scrollTop - shown) * 0.45;
        if (Math.abs(element.scrollTop - shown) < 0.2)
          shown = element.scrollTop;
      }

      const height = Math.max(base * (1 - squash) + stretch, 10);
      const progress = shown / range;
      const top = FADE * Math.min(1, progress / RELEASE);
      const bottom = FADE * Math.min(1, (1 - progress) / RELEASE);

      if (base !== lastBase) {
        bar.style.height = `${base}px`;
        lastBase = base;
      }
      bar.style.transform = `translateY(${
        progress * (element.clientHeight - height)
      }px) scaleY(${height / base})`;

      const paintKey = `${top.toFixed(1)}:${bottom.toFixed(1)}`;
      if (paintKey !== lastPaint) {
        line.style.background = `linear-gradient(to bottom, transparent 0%, var(--ink) ${top.toFixed(
          1,
        )}%, var(--ink) ${(100 - bottom).toFixed(1)}%, transparent 100%)`;
        lastPaint = paintKey;
      }

      const settled =
        speed < 0.05 &&
        stretch < 0.4 &&
        squash === 0 &&
        Math.abs(element.scrollTop - shown) < 0.2;
      quiet = settled ? quiet + 1 : 0;
      if (quiet > 20) {
        request = 0;
        return;
      }
      request = requestAnimationFrame(paint);
    }

    function start() {
      quiet = 0;
      if (!request) request = requestAnimationFrame(paint);
    }
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
      cancelAnimationFrame(request);
      clearTimeout(idle.current);
      resize.disconnect();
      mutation.disconnect();
      element.removeEventListener("scroll", start);
    };
  }, []);

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    const element = area.current;
    const bar = thumb.current;
    const frame = box.current;
    if (!element || !bar || !frame) return;

    event.preventDefault();
    const startY = event.clientY;
    const startTop = element.scrollTop;
    const travel = element.clientHeight - bar.offsetHeight;
    const range = element.scrollHeight - element.clientHeight;
    if (travel <= 0) return;

    dragging.current = true;
    frame.dataset.dragging = "";
    bar.setPointerCapture(event.pointerId);
    wake.current();

    const move = (moveEvent: PointerEvent) => {
      element.scrollTop =
        startTop + ((moveEvent.clientY - startY) / travel) * range;
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

  return (
    <div
      {...rest}
      ref={box}
      className={`scroller relative flex flex-col ${className}`}
    >
      <div
        ref={attach}
        onScroll={(event) => {
          flash();
          onScroll?.(event);
        }}
        className={`scroller-area min-h-0 overflow-y-auto overscroll-contain ${contentClassName}`}
      >
        {children}
      </div>
      <div
        ref={thumb}
        aria-hidden
        onPointerDown={startDrag}
        onWheel={(event) => {
          event.stopPropagation();
          area.current?.scrollBy({ top: event.deltaY });
        }}
        className="scroller-thumb absolute right-0 top-0 w-3.5"
      >
        <span
          ref={mark}
          className="scroller-mark absolute inset-y-0 right-[5px] w-[2px]"
        />
      </div>
    </div>
  );
}
