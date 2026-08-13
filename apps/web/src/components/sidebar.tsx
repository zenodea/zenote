"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  SEARCH_MODES,
  parseQuery,
  prepareDocs,
  searchDocs,
  type SearchDoc,
  type SearchMode,
  type SearchResult,
} from "@/lib/search";
import { useSettings } from "@/lib/settings";
import { buildTree, type TreeNode } from "@/lib/tree";
import {
  createFolder,
  createNote,
  discardOverlay,
  moveNote,
  useVaultDocs,
} from "@/lib/vault";
import { AiButton } from "@/components/ai-assistant";
import { Button } from "@/components/button";
import { ChevronIcon } from "@/components/chevron-icon";
import { Dropdown } from "@/components/dropdown";
import { Segmented } from "@/components/segmented";

const TAG_LIST_LIMIT = 100;

/** "note.md" → "note"; rejects empty and path-escaping names. */
function sanitizeName(raw: string): string | null {
  const name = raw
    .trim()
    .replace(/\.md$/i, "")
    .replace(/^\/+|\/+$/g, "");
  if (!name || name.split("/").some((s) => !s.trim() || s === "..")) {
    return null;
  }
  return name;
}

export function Sidebar({ docs }: { docs: SearchDoc[] }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [modeOverride, setModeOverride] = useState<SearchMode | null>(null);
  const [tagFilter, setTagFilter] = useState("");
  const [naming, setNaming] = useState<"note" | "folder" | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
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

  function handleDrop(slug: string, folder: string) {
    setDropTarget(null);
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

  function toggle(path: string) {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (!next.delete(path)) next.add(path);
      return next;
    });
  }

  const parsed = parseQuery(query);
  const searching = parsed.terms.length > 0 || parsed.tags.length > 0;
  const results = useMemo(
    () => searchDocs(prepared, parseQuery(query), mode === "content"),
    [prepared, query, mode],
  );

  function toggleTag(tag: string) {
    const token = `#${tag}`;
    const tokens = query.split(/\s+/).filter(Boolean);
    const has = tokens.some((t) => t.toLowerCase() === token);
    const next = has
      ? tokens.filter((t) => t.toLowerCase() !== token)
      : [...tokens, token];
    setQuery(next.join(" "));
  }

  return (
    <nav
      data-seam="right"
      className="flex w-64 shrink-0 flex-col border-r border-foreground/15 text-sm"
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
          <>
            <Link
              href="/"
              aria-label="Zenote home"
              title="Zenote"
              className="flex min-w-0 flex-1 items-center hover:opacity-70"
            >
              <LogoIcon />
            </Link>
            <Button
              onClick={() => setNaming("note")}
              active={naming === "note"}
              aria-label="New note"
              title="New note"
              className="shrink-0"
            >
              <FilePlusIcon />
            </Button>
            <Button
              onClick={() => setNaming("folder")}
              active={naming === "folder"}
              aria-label="New folder"
              title="New folder"
              className="shrink-0"
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
          className="shrink-0"
        >
          <SearchIcon />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        {searchOpen ? (
          <>
            <Segmented
              options={SEARCH_MODES}
              value={mode}
              onChange={setModeOverride}
              ariaLabel="Search in"
              className="mb-3"
            />
            {allTags.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                <TagPicker
                  allTags={allTags}
                  activeTags={parsed.tags}
                  filter={tagFilter}
                  onFilter={setTagFilter}
                  onToggle={toggleTag}
                />
                {parsed.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    aria-label={`Remove tag filter ${tag}`}
                    className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs text-accent hover:opacity-70"
                  >
                    #{tag} ×
                  </button>
                ))}
              </div>
            )}
            {!searching ? (
              <p className="opacity-50">Type to search, or pick a tag…</p>
            ) : results.length === 0 ? (
              <p className="opacity-50">No matches</p>
            ) : (
              <ResultList results={results} pathname={pathname} />
            )}
          </>
        ) : (
          <div
            className={`min-h-full rounded ${
              dropTarget === "" ? "bg-foreground/5" : ""
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setDropTarget("");
            }}
            onDragLeave={() => setDropTarget(null)}
            onDrop={(event) => {
              event.preventDefault();
              const slug = event.dataTransfer.getData("application/x-note");
              if (slug) handleDrop(slug, "");
            }}
          >
            {naming && (
              <NamingRow
                kind={naming}
                onSubmit={submitName}
                onCancel={() => setNaming(null)}
              />
            )}
            <NodeList
              nodes={tree}
              depth={0}
              collapsed={collapsed}
              onToggle={toggle}
              pathname={pathname}
              modified={vault.modified}
              dropTarget={dropTarget}
              onDropTarget={setDropTarget}
              onDrop={handleDrop}
            />
          </div>
        )}
      </div>
      {vault.changeCount > 0 && (
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
        className="flex shrink-0 items-center justify-between border-t border-foreground/15 p-2"
      >
        <Link
          href="/settings"
          aria-label="Settings"
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
        <AiButton />
      </div>
    </nav>
  );
}

function LogoIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className="block shrink-0"
    >
      <path
        d="M16 16h32M16 32h22M16 48h32"
        stroke="var(--foreground)"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <path
        d="M51 13 13 51"
        stroke="var(--accent)"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
      className="block"
    >
      <path d="M2 3.5h12M2 8h12M2 12.5h12" />
      <circle cx="10.5" cy="3.5" r="1.75" fill="var(--background)" />
      <circle cx="5.5" cy="8" r="1.75" fill="var(--background)" />
      <circle cx="10.5" cy="12.5" r="1.75" fill="var(--background)" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
      className="block"
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3.5 3.5" />
    </svg>
  );
}

function TagPicker({
  allTags,
  activeTags,
  filter,
  onFilter,
  onToggle,
}: {
  allTags: string[];
  activeTags: string[];
  filter: string;
  onFilter: (value: string) => void;
  onToggle: (tag: string) => void;
}) {
  const needle = filter.trim().toLowerCase();
  const matching = needle
    ? allTags.filter((tag) => tag.includes(needle))
    : allTags;
  const shown = matching.slice(0, TAG_LIST_LIMIT);

  return (
    <Dropdown
      label={
        <span className="flex items-center gap-1">
          Tags{activeTags.length > 0 ? ` (${activeTags.length})` : ""}
          <ChevronIcon className="w-3 rotate-90" />
        </span>
      }
      align="left"
      closeOnClick={false}
      ariaLabel="Filter by tag"
    >
      {allTags.length > 8 && (
        <input
          autoFocus
          type="search"
          value={filter}
          onChange={(event) => onFilter(event.target.value)}
          placeholder="Find tag…"
          aria-label="Find tag"
          className="mb-1 w-full rounded border border-foreground/15 bg-background px-2 py-1 text-xs placeholder:opacity-50 focus:border-foreground/40 focus:outline-none"
        />
      )}
      <ul className="max-h-60 overflow-y-auto overscroll-contain">
        {shown.map((tag) => (
          <li key={tag}>
            <Button
              variant="row"
              active={activeTags.includes(tag)}
              onClick={() => onToggle(tag)}
              className="pl-2"
            >
              #{tag}
            </Button>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="px-2 py-1.5 opacity-50">No tags found</li>
        )}
      </ul>
      {matching.length > shown.length && (
        <p className="px-2 py-1 text-xs opacity-50">
          {matching.length - shown.length} more — type to narrow
        </p>
      )}
    </Dropdown>
  );
}

function ResultList({
  results,
  pathname,
}: {
  results: SearchResult[];
  pathname: string;
}) {
  return (
    <ul className="space-y-0.5">
      {results.map((result) => {
        const href = `/notes/${result.slug}`;
        return (
          <li key={result.slug}>
            <Link
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={`block rounded px-2 py-1.5 hover:bg-foreground/10 ${
                pathname === href ? "bg-foreground/10" : ""
              }`}
            >
              <span className="block truncate">
                <TitleHighlight
                  title={result.title}
                  indices={result.titleIndices}
                />
                {result.folder && (
                  <span className="ml-2 text-xs opacity-50">
                    {result.folder}
                  </span>
                )}
              </span>
              {result.snippet && (
                <span className="block truncate text-xs opacity-60">
                  {result.snippet.before}
                  <span className="font-medium text-accent">
                    {result.snippet.match}
                  </span>
                  {result.snippet.after}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function TitleHighlight({
  title,
  indices,
}: {
  title: string;
  indices: number[] | null;
}) {
  if (!indices) return title;
  const marked = new Set(indices);
  return [...title].map((char, index) =>
    marked.has(index) ? (
      <span key={index} className="font-medium text-accent">
        {char}
      </span>
    ) : (
      char
    ),
  );
}

function NamingRow({
  kind,
  onSubmit,
  onCancel,
}: {
  kind: "note" | "folder";
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");

  return (
    <div className="mb-2 flex items-center gap-1.5">
      <span className="shrink-0 opacity-60">
        {kind === "note" ? <FilePlusIcon /> : <FolderPlusIcon />}
      </span>
      <input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onSubmit(name);
          if (event.key === "Escape") onCancel();
        }}
        onBlur={onCancel}
        placeholder={kind === "note" ? "Note name…" : "Folder name…"}
        aria-label={kind === "note" ? "New note name" : "New folder name"}
        className="min-w-0 flex-1 rounded border border-foreground/15 bg-background px-2 py-1 placeholder:opacity-50 focus:border-foreground/40 focus:outline-none"
      />
    </div>
  );
}

type NodeListProps = {
  nodes: TreeNode[];
  depth: number;
  collapsed: Set<string>;
  onToggle: (path: string) => void;
  pathname: string;
  modified: Set<string>;
  dropTarget: string | null;
  onDropTarget: (path: string | null) => void;
  onDrop: (slug: string, folder: string) => void;
};

function NodeList({
  nodes,
  depth,
  collapsed,
  onToggle,
  pathname,
  modified,
  dropTarget,
  onDropTarget,
  onDrop,
}: NodeListProps) {
  const nested = {
    depth: depth + 1,
    collapsed,
    onToggle,
    pathname,
    modified,
    dropTarget,
    onDropTarget,
    onDrop,
  };

  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => {
        const folderIndent = { paddingLeft: `${depth * 0.75 + 0.5}rem` };
        const fileIndent = { paddingLeft: `${depth * 0.75 + 1.5}rem` };

        if (node.kind === "folder") {
          const isCollapsed = collapsed.has(node.path);

          return (
            <li key={node.path}>
              <Button
                variant="row"
                onClick={() => onToggle(node.path)}
                style={folderIndent}
                aria-expanded={!isCollapsed}
                className={dropTarget === node.path ? "bg-foreground/10" : ""}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onDropTarget(node.path);
                }}
                onDragLeave={(event) => {
                  event.stopPropagation();
                  onDropTarget(null);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const slug =
                    event.dataTransfer.getData("application/x-note");
                  if (slug) onDrop(slug, node.path);
                }}
              >
                <ChevronIcon
                  className={`w-3 shrink-0 transition-transform ${
                    isCollapsed ? "" : "rotate-90"
                  }`}
                />
                {node.name}
              </Button>

              {!isCollapsed && <NodeList nodes={node.children} {...nested} />}
            </li>
          );
        }

        const href = `/notes/${node.slug}`;
        const isActive = pathname === href;

        return (
          <li key={node.slug}>
            <Link
              href={href}
              style={fileIndent}
              aria-current={isActive ? "page" : undefined}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("application/x-note", node.slug);
              }}
              className={`block truncate rounded py-1.5 pr-2 hover:bg-foreground/10 ${
                isActive ? "bg-foreground/10" : ""
              }`}
            >
              {node.name}
              {modified.has(node.slug) && (
                <span
                  title="Changed locally"
                  className="ml-1.5 inline-block size-1.5 rounded-full bg-accent align-middle"
                />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function FilePlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="block"
    >
      <path d="M9 1.5H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.5l-4-4Z" />
      <path d="M9 1.5V5.5h4M8 8v4M6 10h4" />
    </svg>
  );
}

function FolderPlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="block"
    >
      <path d="M1.5 3.5a1 1 0 0 1 1-1h3l1.5 2h6a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-10.5a1 1 0 0 1-1-1v-9Z" />
      <path d="M8 7.5v4M6 9.5h4" />
    </svg>
  );
}
