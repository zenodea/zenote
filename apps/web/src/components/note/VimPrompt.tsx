"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useFooterClaim, useFooterHost } from "@/lib/stores/footer";

/**
 * Vim's : and / prompts, in the shared footer. The engine writes into this
 * element whenever a prompt opens, so what is in the DOM — not React — decides
 * whether the footer is up.
 */
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

    const check = () => setPrompting(element.childElementCount > 0);
    const observer = new MutationObserver(check);
    observer.observe(element, { childList: true });
    check();

    return () => observer.disconnect();
  }, [footer]);

  useFooterClaim(prompting);
  if (!footer) return null;

  return createPortal(
    <div
      ref={(node) => {
        own.current = node;
        hostRef.current = node;
      }}
      className="vim-statusbar flex h-11 items-center gap-2 px-4 font-mono text-xs"
    />,
    footer,
  );
}
