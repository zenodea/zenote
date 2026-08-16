"use client";

import { useState } from "react";
import { setFooterHost, useFooterOpen } from "@/lib/stores/footer";

const ROW = 44;
// The rule counts: at 44 the seam lands a pixel below the sidebar footer's and
// the junction marks double up.
const TOTAL = ROW + 1;

/**
 * The page's bottom plane: one bar that rises for whatever needs to be down
 * there — find, vim's prompts. It travels on a transform, so nothing reflows.
 *
 * The seam is claimed only once it has landed: Junctions re-measures every seam
 * on every frame of a transition, and claiming it early drags a mark up behind
 * the bar. The slide itself lives in frame.css with the rest of the motion.
 */
export function Footer() {
  const open = useFooterOpen();

  const [settled, setSettled] = useState(false);
  if (!open && settled) setSettled(false);

  return (
    <div
      data-open={open || undefined}
      data-seam={settled ? "top" : undefined}
      onTransitionEnd={() => {
        if (open) setSettled(true);
      }}
      style={{ height: TOTAL }}
      className="app-footer absolute inset-x-0 bottom-0 z-20 border-t border-foreground/15 bg-background"
    >
      <div ref={setFooterHost} style={{ height: ROW }} />
    </div>
  );
}
