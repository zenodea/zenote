"use client";

import Link from "next/link";
import { AiButton } from "@/components/ai/AiButton";
import { iconClass } from "@/components/ui/Button";
import { GraphIcon, SlidersIcon } from "@/components/ui/Icons";

// WebGL is the bulk of the graph route's chunk; hover buys it a head start.
function warmRenderer() {
  import("@/lib/graph/pixi-scene").catch(() => {});
}

export function SidebarFooter({
  minimised,
  pathname,
}: {
  minimised: boolean;
  pathname: string;
}) {
  return (
    <div
      data-seam="top"
      className={`flex shrink-0 border-t border-foreground/15 p-2 ${
        minimised ? "flex-col items-center gap-1" : "items-center justify-between"
      }`}
    >
      <Link
        href="/settings"
        aria-label="Settings"
        title="Settings"
        aria-current={pathname === "/settings" ? "page" : undefined}
        className={`block ${iconClass(pathname === "/settings")}`}
      >
        <SlidersIcon />
      </Link>
      <div className={`flex items-center gap-1 ${minimised ? "flex-col" : ""}`}>
        <Link
          href="/graph"
          aria-label="Graph"
          title="Graph"
          aria-current={pathname === "/graph" ? "page" : undefined}
          className={`block ${iconClass(pathname === "/graph")}`}
          onPointerEnter={warmRenderer}
          onFocus={warmRenderer}
        >
          <GraphIcon />
        </Link>
        <AiButton />
      </div>
    </div>
  );
}
