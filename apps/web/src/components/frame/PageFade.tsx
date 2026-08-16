"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  beginPageFade,
  endPageFade,
  navigatesAway,
  usePageFading,
} from "@/lib/page-fade";

/** Links are picked up from the document, so only `router.push` callers need `beginPageFade`. */
export function PageFade({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const fading = usePageFading();

  // Capture phase: Link commits on bubble, and a handler between may stop propagation first.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (navigatesAway(event)) beginPageFade();
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // The incoming tree is already committed, so this rides back up from wherever the fade reached.
  useEffect(() => {
    endPageFade();
  }, [pathname]);

  useEffect(() => endPageFade, []);

  return (
    <div
      className="page-fade flex min-h-0 flex-1 flex-col"
      data-fading={fading || undefined}
    >
      {children}
    </div>
  );
}
