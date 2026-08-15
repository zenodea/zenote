"use client";

import Link from "next/link";
import { AiButton } from "@/components/ai/AiButton";
import { iconClass } from "@/components/ui/Button";
import { GraphIcon, SlidersIcon } from "@/components/ui/Icons";
import { discardOverlay } from "@/lib/stores/vault";

export function SidebarFooter({
  minimised,
  pathname,
  changeCount,
}: {
  minimised: boolean;
  pathname: string;
  changeCount: number;
}) {
  return (
    <>
      {!minimised && changeCount > 0 && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-foreground/15 px-4 py-1.5 text-xs">
          <span className="min-w-0 truncate opacity-60">
            {changeCount} local {changeCount === 1 ? "change" : "changes"} — not
            saved
          </span>
          <button
            type="button"
            onClick={() => {
              if (confirm("Discard all local changes?")) discardOverlay();
            }}
            className="shrink-0 opacity-60 hover:opacity-100"
          >
            Discard
          </button>
        </div>
      )}
      <div
        data-seam="top"
        className={`flex shrink-0 border-t border-foreground/15 p-2 ${
          minimised
            ? "flex-col items-center gap-1"
            : "items-center justify-between"
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
        <div
          className={`flex items-center gap-1 ${minimised ? "flex-col" : ""}`}
        >
          <Link
            href="/graph"
            aria-label="Graph"
            title="Graph"
            aria-current={pathname === "/graph" ? "page" : undefined}
            className={`block ${iconClass(pathname === "/graph")}`}
          >
            <GraphIcon />
          </Link>
          <AiButton />
        </div>
      </div>
    </>
  );
}
