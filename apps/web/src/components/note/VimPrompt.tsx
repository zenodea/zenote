"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useFooterClaim, useFooterHost } from "@/lib/stores/footer";

/** Vim's : and / prompts: the engine writes into this element, so the DOM decides. */
export function VimPrompt({
  hostRef,
}: {
  hostRef: RefObject<HTMLDivElement | null>;
}) {
  const footer = useFooterHost();
  const own = useRef<HTMLDivElement | null>(null);
  const [prompting, setPrompting] = useState(false);

  useEffect(() => {
    const element = own.current;
    if (!element) return;

    // A prompt is a dialog div; the mode indicators the engine also appends are spans.
    const check = () =>
      setPrompting(element.querySelector(":scope > div") !== null);
    const observer = new MutationObserver(check);
    observer.observe(element, { childList: true });
    check();

    return () => observer.disconnect();
  }, [footer]);

  useFooterClaim("vim", prompting);
  if (!footer) return null;

  return createPortal(
    <div
      ref={(node) => {
        own.current = node;
        hostRef.current = node;
      }}
      className={`vim-statusbar absolute inset-0 flex items-center gap-2 px-4 font-mono text-xs ${
        prompting ? "" : "pointer-events-none"
      }`}
    />,
    footer,
  );
}
