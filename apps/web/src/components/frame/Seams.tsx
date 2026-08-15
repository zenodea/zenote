"use client";

import type { CSSProperties, ReactNode } from "react";

export function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center px-6">
      <div className="w-full max-w-[280px]">{children}</div>
    </div>
  );
}

export function Mark({ style }: { style: CSSProperties }) {
  return (
    <span
      aria-hidden
      style={style}
      className="pointer-events-none fixed z-10 size-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-foreground/30 bg-background transition-opacity"
    />
  );
}

export function Seam({
  className,
  style,
  origin,
  axis,
  open,
  transition,
}: {
  className: string;
  style: CSSProperties;
  origin: string;
  axis: "X" | "Y";
  open: boolean;
  transition: string;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed bg-foreground/15 ${className}`}
      style={{
        ...style,
        transformOrigin: origin,
        transform: `scale${axis}(${open ? 1 : 0})`,
        transition: `${transition}, ${style.transitionProperty} ${style.transitionDuration}`,
      }}
    />
  );
}

export function Trace({ side, active }: { side: number; active: boolean }) {
  const perimeter = 4 * (side - 1);

  return (
    <svg
      aria-hidden
      width={side}
      height={side}
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rotate-45 transition-opacity duration-300"
      style={{ opacity: active ? 1 : 0 }}
    >
      <rect
        x={0.5}
        y={0.5}
        width={side - 1}
        height={side - 1}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.5}
        style={{
          ["--trace" as string]: `${perimeter}px`,
          strokeDasharray: `${perimeter * 0.16} ${perimeter * 0.84}`,
          animation: active ? "diamond-trace 1.4s linear infinite" : "none",
        }}
      />
    </svg>
  );
}
