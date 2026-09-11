"use client";

import Link from "next/link";
import { AiButton } from "@/components/ai/AiButton";
import { SyncStatus } from "@/components/frame/SyncStatus";
import { iconClass } from "@/components/ui/Button";
import { GraphIcon, SlidersIcon, TodoIcon } from "@/components/ui/Icons";
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
      className={`flex shrink-0 items-center border-t border-foreground/15 p-2 ${
        minimised ? "justify-center" : "justify-between"
      }`}
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
          className={`flex min-w-0 justify-center transition-opacity ${reveal} ${
            minimised ? "w-0 overflow-hidden" : "flex-1"
          }`}
        >
          <Link
            href="/vaults"
            title="Vaults"
            aria-current={pathname === "/vaults" ? "page" : undefined}
            className={`flex min-w-0 items-center gap-1.5 rounded px-3 py-1.5 ${
              pathname === "/vaults"
                ? "bg-foreground/10 text-accent"
                : "opacity-60 hover:bg-foreground/10 hover:opacity-100"
            }`}
          >
            <SyncStatus />
            <span className="max-w-36 truncate text-sm">{vault.name}</span>
          </Link>
        </div>
      )}
      {!drawer && (
        <div
          inert={minimised}
          className={`flex shrink-0 items-center gap-1 transition-opacity ${reveal} ${
            minimised ? "w-0 overflow-hidden" : ""
          }`}
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
          <Link
            href="/todos"
            aria-label="Todos"
            title="Todos"
            aria-current={pathname === "/todos" ? "page" : undefined}
            className={`block ${iconClass(pathname === "/todos")}`}
          >
            <TodoIcon />
          </Link>
          <AiButton />
        </div>
      )}
    </div>
  );
}
