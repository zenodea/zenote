"use client";

import type { ComponentProps } from "react";
import { useScrollThumb } from "@/components/ui/use-scroll-thumb";
import type { Axis } from "@/lib/scroller-physics";

const LAYOUT = {
  y: {
    area: "min-h-0 overflow-y-auto overscroll-contain",
    strip: "right-0 top-0 w-3.5",
    mark: "inset-y-0 right-[0px] w-[2px]",
  },
  x: {
    area: "min-w-0 overflow-x-auto overscroll-x-none overscroll-y-auto",
    strip: "bottom-0 left-0 h-3.5",
    mark: "inset-x-0 bottom-[0px] h-[2px]",
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
  const { box, attachArea, thumb, mark, flash, startDrag, onThumbWheel } =
    useScrollThumb(axis, scrollRef);
  const layout = LAYOUT[axis];

  return (
    <div
      {...rest}
      ref={box}
      data-axis={axis}
      className={`scroller relative flex flex-col ${className}`}
    >
      <div
        ref={attachArea}
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
        onWheel={onThumbWheel}
        className={`scroller-thumb absolute ${layout.strip}`}
      >
        <span ref={mark} className={`scroller-mark absolute ${layout.mark}`} />
      </div>
    </div>
  );
}
