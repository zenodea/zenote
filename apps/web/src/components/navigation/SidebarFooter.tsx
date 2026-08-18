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
  reveal,
  pathname,
}: {
  minimised: boolean;
  reveal: string;
  pathname: string;
}) {
  return (
    <div
      data-seam="top"
      className="flex shrink-0 items-center justify-between border-t border-foreground/15 p-2"
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
      <div
        inert={minimised}
        className={`flex shrink-0 items-center gap-1 transition-opacity ${reveal}`}
      >
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
