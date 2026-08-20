"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useEscape } from "@/hooks/use-hotkey";

const VIEWPORT_MARGIN = 8;
const TRIGGER_GAP = 4;

export function Dropdown({
  label,
  children,
  align = "right",
  direction = "down",
  closeOnClick = true,
  ariaLabel,
  triggerClassName,
}: {
  label: ReactNode;
  children: ReactNode;
  align?: "left" | "right" | "center";
  direction?: "down" | "up";
  closeOnClick?: boolean;
  ariaLabel?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEscape(() => setOpen(false), open);

  useLayoutEffect(() => {
    if (!open) return;

    function place() {
      const trigger = root.current;
      const panel = menu.current;
      if (!trigger || !panel) return;

      const rect = trigger.getBoundingClientRect();
      const width = panel.offsetWidth;
      const height = panel.offsetHeight;

      let left =
        align === "center"
          ? rect.left + rect.width / 2 - width / 2
          : align === "right"
            ? rect.right - width
            : rect.left;
      left = Math.min(
        Math.max(left, VIEWPORT_MARGIN),
        window.innerWidth - width - VIEWPORT_MARGIN,
      );

      let top =
        direction === "up"
          ? rect.top - height - TRIGGER_GAP
          : rect.bottom + TRIGGER_GAP;
      top = Math.min(
        Math.max(top, VIEWPORT_MARGIN),
        window.innerHeight - height - VIEWPORT_MARGIN,
      );

      setPos({ left, top });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, align, direction]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (root.current?.contains(target) || menu.current?.contains(target))
        return;
      setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
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

      {open &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            onClick={closeOnClick ? () => setOpen(false) : undefined}
            style={
              pos ? { left: pos.left, top: pos.top } : { visibility: "hidden" }
            }
            className="fixed z-50 min-w-36 rounded border border-foreground/15 bg-background p-1 text-sm shadow-lg"
          >
            {children}
          </div>,
          document.body,
        )}
    </div>
  );
}
