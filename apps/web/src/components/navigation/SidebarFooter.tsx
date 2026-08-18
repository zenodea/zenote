"use client";

import Link from "next/link";
import { AiButton } from "@/components/ai/AiButton";
import { SyncStatus } from "@/components/frame/SyncStatus";
import { iconClass } from "@/components/ui/Button";
import { GraphIcon, SlidersIcon } from "@/components/ui/Icons";

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
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href="/settings"
          aria-label="Settings"
          title="Settings"
          aria-current={pathname === "/settings" ? "page" : undefined}
          className={`block shrink-0 ${iconClass(pathname === "/settings")}`}
        >
          <SlidersIcon />
        </Link>
        <SyncStatus className={reveal} />
      </div>
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
