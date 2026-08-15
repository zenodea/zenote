"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  parseQuery,
  prepareDocs,
  searchDocs,
  type SearchDoc,
  type SearchMode,
} from "@/lib/search";
import { updateSettings, useSettings } from "@/lib/settings";
import { buildTree } from "@/lib/tree";
import {
  createFolder,
  createNote,
  discardOverlay,
  moveNote,
  sanitizeName,
  useVaultDocs,
} from "@/lib/vault";
import { AiButton } from "@/components/AiAssistant";
import { NoteTree } from "@/components/navigation/NoteTree";
import { SidebarSearch } from "@/components/navigation/SidebarSearch";
import { Button } from "@/components/ui/Button";
import { Scroller } from "@/components/ui/Scroller";
import {
  FilePlusIcon,
  FolderPlusIcon,
  GraphIcon,
  LogoIcon,
  SearchIcon,
  SlidersIcon,
} from "@/components/ui/Icons";

export function Sidebar({ docs }: { docs: SearchDoc[] }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [modeOverride, setModeOverride] = useState<SearchMode | null>(null);
  const [naming, setNaming] = useState<"note" | "folder" | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const settings = useSettings();
  const mode = modeOverride ?? settings.searchMode;

  const vault = useVaultDocs(docs);
  const tree = useMemo(
    () => buildTree(vault.docs, vault.folders),
    [vault.docs, vault.folders],
  );
  const prepared = useMemo(() => prepareDocs(vault.docs), [vault.docs]);
  const allTags = useMemo(
    () => [...new Set(vault.docs.flatMap((doc) => doc.tags))].sort(),
    [vault.docs],
  );

  const parsed = useMemo(() => parseQuery(query), [query]);
  const searching = parsed.terms.length > 0 || parsed.tags.length > 0;
  const results = useMemo(
    () => searchDocs(prepared, parsed, mode === "content"),
    [prepared, parsed, mode],
  );

  function submitName(raw: string) {
    const name = sanitizeName(raw);
    setNaming(null);
    if (!name) return;
    if (naming === "folder") {
      createFolder(name);
      return;
    }
    if (!vault.docs.some((doc) => doc.slug === name)) createNote(name);
    router.push(`/notes/${name}`);
  }

  function handleMove(slug: string, folder: string) {
    const doc = vault.docs.find((entry) => entry.slug === slug);
    if (!doc) return;
    const filename = slug.split("/").pop()!;
    const next = folder ? `${folder}/${filename}` : filename;
    if (next === slug) return;

    moveNote(slug, folder, {
      body: doc.body,
      isBaseNote: docs.some((entry) => entry.slug === slug),
    });
    if (pathname === `/notes/${slug}`) router.push(`/notes/${next}`);
  }

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
  }

  function toggleFolder(path: string) {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (!next.delete(path)) next.add(path);
      return next;
    });
  }

  function toggleTag(tag: string) {
    const token = `#${tag}`;
    const tokens = query.split(/\s+/).filter(Boolean);
    const has = tokens.some((t) => t.toLowerCase() === token);
    const next = has
      ? tokens.filter((t) => t.toLowerCase() !== token)
      : [...tokens, token];
    setQuery(next.join(" "));
  }

  const minimised = settings.sidebarCollapsed;

  function toggleSidebar() {
    const next = !minimised;

    if (next) closeSearch();
    updateSettings({ sidebarCollapsed: next });
  }

  const reveal = minimised
    ? "pointer-events-none opacity-0 duration-150"
    : "opacity-100 delay-200 duration-200";

  return (
    <nav
      data-seam="right"
      className={`flex shrink-0 flex-col overflow-hidden border-r border-foreground/15 text-sm transition-[width] duration-300 ease-in-out ${
        minimised ? "w-[60px]" : "w-64"
      }`}
    >
      <div
        data-seam="bottom"
        className="flex h-14 shrink-0 items-center gap-2 border-b border-foreground/15 px-4"
      >
        {searchOpen ? (
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") closeSearch();
            }}
            placeholder="Search notes…"
            aria-label="Search notes"
            className="min-w-0 flex-1 rounded border border-foreground/15 bg-background px-2 py-1 placeholder:opacity-50 focus:border-foreground/40 focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={minimised ? "Expand sidebar" : "Minimise sidebar"}
            aria-pressed={minimised}
            title={minimised ? "Expand sidebar" : "Minimise sidebar"}
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
                onClick={() => setNaming(naming === "note" ? null : "note")}
                onMouseDown={(event) => event.preventDefault()}
                active={naming === "note"}
                aria-pressed={naming === "note"}
                aria-label="New note"
                title="New note"
              >
                <FilePlusIcon />
              </Button>
              <Button
                onClick={() => setNaming(naming === "folder" ? null : "folder")}
                onMouseDown={(event) => event.preventDefault()}
                active={naming === "folder"}
                aria-pressed={naming === "folder"}
                aria-label="New folder"
                title="New folder"
              >
                <FolderPlusIcon />
              </Button>
            </>
          )}
          <Button
            onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
            active={searchOpen}
            aria-pressed={searchOpen}
            aria-label="Search notes"
            title="Search notes"
          >
            <SearchIcon />
          </Button>
        </div>
      </div>
      <Scroller
        inert={minimised}
        className={`min-h-0 w-64 flex-1 transition-opacity ${reveal}`}
        contentClassName="p-4"
      >
        {searchOpen ? (
          <SidebarSearch
            mode={mode}
            onModeChange={setModeOverride}
            allTags={allTags}
            activeTags={parsed.tags}
            onToggleTag={toggleTag}
            searching={searching}
            results={results}
            pathname={pathname}
          />
        ) : (
          <NoteTree
            tree={tree}
            collapsed={collapsed}
            onToggleFolder={toggleFolder}
            pathname={pathname}
            modified={vault.modified}
            naming={naming}
            onSubmitName={submitName}
            onCancelName={() => setNaming(null)}
            onMove={handleMove}
          />
        )}
      </Scroller>
      {!minimised && vault.changeCount > 0 && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-foreground/15 px-4 py-1.5 text-xs">
          <span className="min-w-0 truncate opacity-60">
            {vault.changeCount} local{" "}
            {vault.changeCount === 1 ? "change" : "changes"} — not saved
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
          // Mirrors the Button icon variant, active state included.
          className={`block rounded p-1.5 ${
            pathname === "/settings"
              ? "bg-foreground/10 text-accent"
              : "opacity-60 hover:bg-foreground/10 hover:opacity-100"
          }`}
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
            className={`block rounded p-1.5 ${
              pathname === "/graph"
                ? "bg-foreground/10 text-accent"
                : "opacity-60 hover:bg-foreground/10 hover:opacity-100"
            }`}
          >
            <GraphIcon />
          </Link>
          <AiButton />
        </div>
      </div>
    </nav>
  );
}
