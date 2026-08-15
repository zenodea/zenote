"use client";

import type { ReactNode } from "react";
import { Diamond } from "@/components/frame/Diamond";
import { useEscape } from "@/hooks/use-hotkey";

export function Modal({
  title,
  onClose,
  children,
  className = "max-w-sm",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  useEscape(onClose);

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className={`relative w-full border border-foreground/15 bg-background p-4 text-sm ${className}`}
      >
        <Diamond className="left-0 top-0" />
        <Diamond className="left-full top-0" />
        <Diamond className="left-0 top-full" />
        <Diamond className="left-full top-full" />
        <h2 className="font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
