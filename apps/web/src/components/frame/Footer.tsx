"use client";

import { setFooterHost, useFooterOpen } from "@/lib/stores/footer";

const ROW = 44;
// The rule counts: at 44 the seam lands a pixel below the sidebar footer's.
const TOTAL = ROW + 1;

/** The page's bottom plane: one bar for whatever needs to be down there — find, vim's prompts. */
export function Footer() {
  const open = useFooterOpen();

  return (
    <div
      data-open={open || undefined}
      data-seam={open ? "top" : undefined}
      style={{ height: TOTAL }}
      className="app-footer absolute inset-x-0 bottom-0 z-20 border-t border-foreground/15 bg-background"
    >
      <div ref={setFooterHost} style={{ height: ROW }} className="relative" />
    </div>
  );
}
