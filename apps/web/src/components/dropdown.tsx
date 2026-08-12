"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function Dropdown({
  label,
  children,
  align = "right",
  direction = "down",
  ariaLabel,
  triggerClassName,
}: {
  label: ReactNode;
  children: ReactNode;
  align?: "left" | "right" | "center";
  direction?: "down" | "up";
  ariaLabel?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={ariaLabel}
        className={
          triggerClassName ??
          "rounded border border-foreground/15 bg-background px-2 py-0.5 text-xs opacity-70 hover:opacity-100"
        }
      >
        {label}
      </button>

      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={`absolute z-20 min-w-36 rounded border border-foreground/15 bg-background p-1 text-sm shadow-lg ${
            direction === "up" ? "bottom-full mb-1" : "top-full mt-1"
          } ${
            align === "right"
              ? "right-0"
              : align === "center"
                ? "left-1/2 -translate-x-1/2"
                : "left-0"
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
