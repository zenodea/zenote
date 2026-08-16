"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  beginPageFade,
  endPageFade,
  navigatesAway,
  usePageFading,
} from "@/lib/page-fade";

/**
 * Cross-fades page content across navigations. Links are picked up from the
 * document, so only imperative `router.push` callers need `beginPageFade`.
 */
export function PageFade({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const fading = usePageFading();

  // Capture phase: Link commits the navigation on bubble, and a handler in
  // between may stop propagation before the fade would ever hear about it.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (navigatesAway(event)) beginPageFade();
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // The incoming tree is already committed by the time the path changes, so
  // this paints it at the opacity the outgoing fade reached and rides back up.
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
