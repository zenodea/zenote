"use client";

import { useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import { setFooterHost, useFooterOpen } from "@/lib/stores/footer";

const ROW = 44;
const TOTAL = ROW + 1;

export function Footer() {
  const open = useFooterOpen();

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
