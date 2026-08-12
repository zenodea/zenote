"use client";

import { useRef, useState, type ReactNode } from "react";

export function CodeBlock({
  text,
  children,
}: {
  text: string;
  children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="group relative">
      <pre>{children}</pre>
      <button
        type="button"
        onClick={copy}
        className="absolute right-2 top-2 rounded border border-foreground/20 bg-background/60 px-2 py-0.5 text-xs text-foreground opacity-0 backdrop-blur transition-opacity hover:bg-foreground/10 focus-visible:opacity-100 group-hover:opacity-100"
        aria-label="Copy code"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
