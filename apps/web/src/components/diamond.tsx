import type { CSSProperties } from "react";

export function Diamond({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      style={style}
      className={`pointer-events-none absolute z-10 size-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-foreground/30 bg-background${
        className ? ` ${className}` : ""
      }`}
    />
  );
}
