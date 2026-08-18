"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useFooterClaim, useFooterHost } from "@/lib/stores/footer";

function unscroll(from: HTMLElement) {
  for (let node = from.parentElement; node; node = node.parentElement) {
    node.scrollTop = 0;
    node.scrollLeft = 0;
  }
}

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

    const check = () => {
      const prompt = element.querySelector(":scope > div") !== null;
      if (prompt) unscroll(element);
      setPrompting(prompt);
    };
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
