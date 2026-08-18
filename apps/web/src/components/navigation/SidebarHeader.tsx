"use client";

import Link from "next/link";
import { Button, iconClass } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  FilePlusIcon,
  FolderPlusIcon,
  LogoIcon,
  SearchIcon,
  SlidersIcon,
} from "@/components/ui/Icons";
import type { useSidebarSearch } from "@/components/navigation/use-sidebar-search";
import type { Naming } from "@/components/navigation/use-vault-actions";

export function SidebarHeader({
  drawer = false,
  minimised,
  reveal,
  onToggleSidebar,
  search,
  naming,
  onNamingChange,
}: {
  drawer?: boolean;
  minimised: boolean;
  reveal: string;
  onToggleSidebar: () => void;
  search: ReturnType<typeof useSidebarSearch>;
  naming: Naming;
  onNamingChange: (naming: Naming) => void;
}) {
  const expandLabel = drawer
    ? "Close menu"
    : minimised
      ? "Expand sidebar"
      : "Minimise sidebar";
  const searchOpen = search.open;

  return (
    <div
      data-seam="bottom"
      className="flex h-14 shrink-0 items-center gap-2 border-b border-foreground/15 px-4"
    >
      {searchOpen ? (
        <Input
          autoFocus
          type="search"
          value={search.query}
          onChange={(event) => search.setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") search.closeSearch();
          }}
          placeholder="Search notes…"
          aria-label="Search notes"
          className="min-w-0 flex-1"
        />
      ) : (
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={expandLabel}
          aria-pressed={drawer ? undefined : minimised}
          title={expandLabel}
          className="flex min-w-0 flex-1 items-center hover:opacity-70"
        >
          <LogoIcon />
        </button>
      )}
      <div
        inert={minimised}
        className={`flex shrink-0 items-center gap-2 transition-opacity ${reveal}`}
      >
        {!searchOpen && (
          <>
            <Button
              onClick={() =>
                onNamingChange(
                  naming?.kind === "note" ? null : { kind: "note", into: "" },
                )
              }
              onMouseDown={(event) => event.preventDefault()}
              active={naming?.kind === "note"}
              aria-pressed={naming?.kind === "note"}
              aria-label="New note"
              title="New note"
            >
              <FilePlusIcon />
            </Button>
            <Button
              onClick={() =>
                onNamingChange(
                  naming?.kind === "folder"
                    ? null
                    : { kind: "folder", into: "" },
                )
              }
              onMouseDown={(event) => event.preventDefault()}
              active={naming?.kind === "folder"}
              aria-pressed={naming?.kind === "folder"}
              aria-label="New folder"
              title="New folder"
            >
              <FolderPlusIcon />
            </Button>
          </>
        )}
        <Button
          onClick={() =>
            searchOpen ? search.closeSearch() : search.openSearch()
          }
          active={searchOpen}
          aria-pressed={searchOpen}
          aria-label="Search notes"
          title="Search notes"
        >
          <SearchIcon />
        </Button>
        {drawer && !searchOpen && (
          <Link
            href="/settings"
            aria-label="Settings"
            className={`block ${iconClass(false)}`}
          >
            <SlidersIcon />
          </Link>
        )}
      </div>
    </div>
  );
}
