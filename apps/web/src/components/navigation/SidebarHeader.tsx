"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  FilePlusIcon,
  FolderPlusIcon,
  LogoIcon,
  SearchIcon,
  ShapesIcon,
} from "@/components/ui/Icons";
import type { useSidebarSearch } from "@/components/navigation/use-sidebar-search";
import {
  startUnnamedDrawing,
  startUnnamedNote,
  type Naming,
} from "@/components/navigation/use-vault-actions";

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
      className={`flex h-14 shrink-0 items-center border-b border-foreground/15 ${
        drawer ? "gap-1 px-3" : "gap-2 px-4"
      }`}
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
        className={`flex shrink-0 items-center transition-opacity ${
          drawer ? "gap-1" : "gap-2"
        } ${reveal} ${minimised ? "w-0 overflow-hidden" : ""}`}
      >
        {!searchOpen && (
          <>
            <Button
              onClick={() => void startUnnamedNote()}
              onMouseDown={(event) => event.preventDefault()}
              aria-label="New note"
              title="New note"
            >
              <FilePlusIcon />
            </Button>
            <Button
              onClick={() => void startUnnamedDrawing()}
              onMouseDown={(event) => event.preventDefault()}
              aria-label="New drawing"
              title="New drawing"
            >
              <ShapesIcon />
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
      </div>
    </div>
  );
}
