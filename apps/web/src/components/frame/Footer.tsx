"use client";

import { useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import { setFooterHost, useFooterOpen } from "@/lib/stores/footer";

const ROW = 44;
// The rule counts: at 44 the seam lands a pixel below the sidebar footer's.
const TOTAL = ROW + 1;

/** The page's bottom plane: one bar for whatever needs to be down there — find, vim's prompts. */
export function Footer() {
  const open = useFooterOpen();

  // A seam claimed mid-slide drags its junction mark up behind the bar.
  const [landed, setLanded] = useState(false);
  const settled = landed || prefersReducedMotion();
  if (!open && landed) setLanded(false);

  return (
    <div
      data-open={open || undefined}
      data-seam={open && settled ? "top" : undefined}
      onTransitionEnd={(event) => {
        if (open && event.target === event.currentTarget) setLanded(true);
      }}
      style={{ height: TOTAL }}
      className="app-footer absolute inset-x-0 z-20 border-t border-foreground/15 bg-background"
    >
      <div ref={setFooterHost} style={{ height: ROW }} className="relative" />
    </div>
  );
}
