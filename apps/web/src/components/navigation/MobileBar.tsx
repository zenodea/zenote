"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AiButton } from "@/components/ai/AiButton";
import { Button } from "@/components/ui/Button";
import {
  FilePlusIcon,
  GraphIcon,
  MenuIcon,
  SearchIcon,
} from "@/components/ui/Icons";
import { openSwitcher } from "@/lib/stores/commands";
import {
  startNoteInDrawer,
  toggleDrawer,
  useDrawer,
} from "@/lib/stores/drawer";

// WebGL is the bulk of the graph route's chunk; a press-and-hold buys it a head start.
function warmRenderer() {
  import("@/lib/graph/pixi-scene").catch(() => {});
}

/**
 * The phone's primary destinations. Everything here is a keyboard shortcut on
 * desktop, which a touch device has no way to reach.
 */
export function MobileBar() {
  const pathname = usePathname();
  const { open } = useDrawer();

  return (
    <nav
      aria-label="Main"
      className="mobile-bar flex shrink-0 items-stretch justify-around border-t border-foreground/15 bg-background md:hidden"
    >
      <Button
        onClick={toggleDrawer}
        active={open}
        aria-expanded={open}
        aria-label="Vault menu"
        className="flex flex-1 items-center justify-center"
      >
        <MenuIcon />
      </Button>
      <Button
        onClick={openSwitcher}
        aria-label="Jump to note"
        className="flex flex-1 items-center justify-center"
      >
        <SearchIcon />
      </Button>
      <Button
        onClick={startNoteInDrawer}
        aria-label="New note"
        className="flex flex-1 items-center justify-center"
      >
        <FilePlusIcon />
      </Button>
      <Link
        href="/graph"
        aria-label="Graph"
        aria-current={pathname === "/graph" ? "page" : undefined}
        onPointerDown={warmRenderer}
        className={`flex flex-1 items-center justify-center ${
          pathname === "/graph" ? "text-accent" : "opacity-60"
        }`}
      >
        <GraphIcon />
      </Link>
      <div className="flex flex-1 items-center justify-center">
        <AiButton />
      </div>
    </nav>
  );
}
