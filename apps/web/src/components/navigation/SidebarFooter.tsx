"use client";

import Link from "next/link";
import { AiButton } from "@/components/ai/AiButton";
import { SyncStatus } from "@/components/frame/SyncStatus";
import { iconClass } from "@/components/ui/Button";
import { GraphIcon, SlidersIcon } from "@/components/ui/Icons";
import { useVault } from "@/lib/vault/store";

function warmRenderer() {
  import("@/lib/graph/pixi-scene").catch(() => {});
}

export function SidebarFooter({
  minimised,
  reveal,
  pathname,
  drawer = false,
}: {
  minimised: boolean;
  reveal: string;
  pathname: string;
  drawer?: boolean;
}) {
  const { vault } = useVault();

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
        className={`block shrink-0 ${iconClass(pathname === "/settings")}`}
      >
        <SlidersIcon />
      </Link>
      {vault && (
        <div
          inert={minimised}
          className={`flex min-w-0 flex-1 justify-center transition-opacity ${reveal}`}
        >
          <Link
            href="/vaults"
            title="Vaults"
            aria-current={pathname === "/vaults" ? "page" : undefined}
            className={`flex min-w-0 flex-col items-center rounded px-3 py-1 ${
              pathname === "/vaults"
                ? "bg-foreground/10 text-accent"
                : "opacity-60 hover:bg-foreground/10 hover:opacity-100"
            }`}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 rotate-45 border border-current"
              />
              <span className="truncate text-sm">{vault.name}</span>
            </span>
            <SyncStatus className="block max-w-full truncate" />
          </Link>
        </div>
      )}
      {!drawer && (
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
      )}
    </div>
  );
}
