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

type Axis = "x" | "y";

const LAYOUT = {
  y: {
    area: "min-h-0 overflow-y-auto overscroll-contain",
    strip: "right-0 top-0 w-3.5",
    mark: "inset-y-0 right-[5px] w-[2px]",
  },
  x: {
    area: "min-w-0 overflow-x-auto overscroll-x-none overscroll-y-auto",
    strip: "bottom-0 left-0 h-3.5",
    mark: "inset-x-0 bottom-[5px] h-[2px]",
  },
} as const;

type ScrollerProps = Omit<ComponentProps<"div">, "ref"> & {
  contentClassName?: string;
  scrollRef?: { current: HTMLDivElement | null };
  axis?: Axis;
};

export function Scroller({
  className = "",
  contentClassName = "",
  scrollRef,
  axis = "y",
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
  const across = axis === "x";

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
    const at = () => (across ? element.scrollLeft : element.scrollTop);
    const view = () => (across ? element.clientWidth : element.clientHeight);
    const span = () => (across ? element.scrollWidth : element.scrollHeight);

    let request = 0;
    let velocity = 0;
    let peak = 0;
    let stretch = 0;
    let squash = 0;
    let shown = at();
    let previousAt = at();
    let previousSpeed = 0;
    let wasPinned = true;
    let quiet = 0;
    let lastBase = -1;
    let lastPaint = "";

    function paint() {
      if (!element || !bar || !line || !frame) return;
      const range = span() - view();
      if (range < 1) {
        delete frame.dataset.scrollable;
        request = 0;
        return;
      }
      frame.dataset.scrollable = "";

      const delta = at() - previousAt;
      previousAt = at();

      velocity = velocity * 0.7 + delta * 0.3;
      const speed = Math.abs(velocity);
      peak = Math.max(speed, peak * 0.92);

      const pinned = at() <= 0.5 || at() >= range - 0.5;
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

      const base = Math.max((view() / span()) * view(), MIN_THUMB);

      const ceiling = Math.min(base * STRETCH_RATIO, MAX_STRETCH);
      const target =
        still || dragging.current
          ? 0
          : ceiling * Math.min(peak / SPEED_FULL, 1);
      stretch += (target - stretch) * 0.2;
      if (still || dragging.current) {
        shown = at();
      } else {
        shown += (at() - shown) * 0.45;
        if (Math.abs(at() - shown) < 0.2) shown = at();
      }

      const length = Math.max(base * (1 - squash) + stretch, 10);
      const progress = shown / range;
      const head = FADE * Math.min(1, progress / RELEASE);
      const tail = FADE * Math.min(1, (1 - progress) / RELEASE);

      if (base !== lastBase) {
        bar.style[across ? "width" : "height"] = `${base}px`;
        lastBase = base;
      }
      const slide = progress * (view() - length);
      const scale = length / base;
      bar.style.transform = across
        ? `translateX(${slide}px) scaleX(${scale})`
        : `translateY(${slide}px) scaleY(${scale})`;

      const paintKey = `${head.toFixed(1)}:${tail.toFixed(1)}`;
      if (paintKey !== lastPaint) {
        line.style.background = `linear-gradient(${
          across ? "to right" : "to bottom"
        }, transparent 0%, var(--ink) ${head.toFixed(
          1,
        )}%, var(--ink) ${(100 - tail).toFixed(1)}%, transparent 100%)`;
        lastPaint = paintKey;
      }

      const settled =
        speed < 0.05 &&
        stretch < 0.4 &&
        squash === 0 &&
        Math.abs(at() - shown) < 0.2;
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
  }, [across]);

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    const element = area.current;
    const bar = thumb.current;
    const frame = box.current;
    if (!element || !bar || !frame) return;

    event.preventDefault();
    const start = across ? event.clientX : event.clientY;
    const from = across ? element.scrollLeft : element.scrollTop;
    const view = across ? element.clientWidth : element.clientHeight;
    const travel = view - (across ? bar.offsetWidth : bar.offsetHeight);
    const range = (across ? element.scrollWidth : element.scrollHeight) - view;
    if (travel <= 0) return;

    dragging.current = true;
    frame.dataset.dragging = "";
    bar.setPointerCapture(event.pointerId);
    wake.current();

    const move = (moveEvent: PointerEvent) => {
      const to =
        from +
        (((across ? moveEvent.clientX : moveEvent.clientY) - start) / travel) *
          range;
      if (across) element.scrollLeft = to;
      else element.scrollTop = to;
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

  const layout = LAYOUT[axis];

  return (
    <div
      {...rest}
      ref={box}
      data-axis={axis}
      className={`scroller relative flex flex-col ${className}`}
    >
      <div
        ref={attach}
        onScroll={(event) => {
          flash();
          onScroll?.(event);
        }}
        className={`scroller-area ${layout.area} ${contentClassName}`}
      >
        {children}
      </div>
      <div
        ref={thumb}
        aria-hidden
        onPointerDown={startDrag}
        onWheel={(event) => {
          event.stopPropagation();
          if (across) {
            area.current?.scrollBy({ left: event.deltaX || event.deltaY });
          } else {
            area.current?.scrollBy({ top: event.deltaY });
          }
        }}
        className={`scroller-thumb absolute ${layout.strip}`}
      >
        <span ref={mark} className={`scroller-mark absolute ${layout.mark}`} />
      </div>
    </div>
  );
}
