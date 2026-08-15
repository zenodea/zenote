import { prefersReducedMotion } from "@/lib/motion";

const MIN_THUMB = 24;
const STRETCH_RATIO = 0.5;
const MAX_STRETCH = 32;
const SPEED_FULL = 30;
const MAX_SQUASH = 0.45;
const FADE = 38;
const RELEASE = 0.12;

export const IDLE_MS = 700;

export type Axis = "x" | "y";

type AxisOps = {
  at: (element: HTMLElement) => number;
  scrollTo: (element: HTMLElement, to: number) => void;
  view: (element: HTMLElement) => number;
  span: (element: HTMLElement) => number;
  thumbLength: (bar: HTMLElement) => number;
  setThumbLength: (bar: HTMLElement, px: number) => void;
  transform: (slide: number, scale: number) => string;
  gradientTo: string;
  point: (event: { clientX: number; clientY: number }) => number;
  wheelDelta: (event: { deltaX: number; deltaY: number }) => number;
};

export const AXIS: Record<Axis, AxisOps> = {
  y: {
    at: (element) => element.scrollTop,
    scrollTo: (element, to) => {
      element.scrollTop = to;
    },
    view: (element) => element.clientHeight,
    span: (element) => element.scrollHeight,
    thumbLength: (bar) => bar.offsetHeight,
    setThumbLength: (bar, px) => {
      bar.style.height = `${px}px`;
    },
    transform: (slide, scale) => `translateY(${slide}px) scaleY(${scale})`,
    gradientTo: "to bottom",
    point: (event) => event.clientY,
    wheelDelta: (event) => event.deltaY,
  },
  x: {
    at: (element) => element.scrollLeft,
    scrollTo: (element, to) => {
      element.scrollLeft = to;
    },
    view: (element) => element.clientWidth,
    span: (element) => element.scrollWidth,
    thumbLength: (bar) => bar.offsetWidth,
    setThumbLength: (bar, px) => {
      bar.style.width = `${px}px`;
    },
    transform: (slide, scale) => `translateX(${slide}px) scaleX(${scale})`,
    gradientTo: "to right",
    point: (event) => event.clientX,
    wheelDelta: (event) => event.deltaX || event.deltaY,
  },
};

export function createScrollPhysics({
  area,
  thumb,
  mark,
  frame,
  axis,
  isDragging,
}: {
  area: HTMLElement;
  thumb: HTMLElement;
  mark: HTMLElement;
  frame: HTMLElement;
  axis: Axis;
  isDragging: () => boolean;
}) {
  const ops = AXIS[axis];
  const still = prefersReducedMotion();
  const at = () => ops.at(area);
  const view = () => ops.view(area);
  const span = () => ops.span(area);

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
      still || isDragging() ? 0 : ceiling * Math.min(peak / SPEED_FULL, 1);
    stretch += (target - stretch) * 0.2;
    if (still || isDragging()) {
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
      ops.setThumbLength(thumb, base);
      lastBase = base;
    }
    thumb.style.transform = ops.transform(
      progress * (view() - length),
      length / base,
    );

    const paintKey = `${head.toFixed(1)}:${tail.toFixed(1)}`;
    if (paintKey !== lastPaint) {
      mark.style.background = `linear-gradient(${
        ops.gradientTo
      }, transparent 0%, var(--ink) ${head.toFixed(1)}%, var(--ink) ${(
        100 - tail
      ).toFixed(1)}%, transparent 100%)`;
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

  return {
    start() {
      quiet = 0;
      if (!request) request = requestAnimationFrame(paint);
    },
    stop() {
      cancelAnimationFrame(request);
      request = 0;
    },
  };
}
