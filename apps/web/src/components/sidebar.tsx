"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import type { TreeNode } from "@/lib/tree";
import { AiButton } from "@/components/ai-assistant";
import { Button } from "@/components/button";
import { ChevronIcon } from "@/components/chevron-icon";
import { Dropdown } from "@/components/dropdown";
import { Segmented } from "@/components/segmented";

const TAG_LIST_LIMIT = 100;

export function Sidebar({
  tree,
  docs,
}: {
  tree: TreeNode[];
  docs: SearchDoc[];
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [modeOverride, setModeOverride] = useState<SearchMode | null>(null);
  const [tagFilter, setTagFilter] = useState("");
  const pathname = usePathname();
  const settings = useSettings();
  const mode = modeOverride ?? settings.searchMode;

  const prepared = useMemo(() => prepareDocs(docs), [docs]);
  const allTags = useMemo(
    () => [...new Set(docs.flatMap((doc) => doc.tags))].sort(),
    [docs],
  );

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
          <Link
            href="/"
            aria-label="Zenote home"
            title="Zenote"
            className="flex min-w-0 flex-1 items-center hover:opacity-70"
          >
            <LogoIcon />
          </Link>
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
          <NodeList
            nodes={tree}
            depth={0}
            collapsed={collapsed}
            onToggle={toggle}
            pathname={pathname}
          />
        )}
      </div>
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

type NodeListProps = {
  nodes: TreeNode[];
  depth: number;
  collapsed: Set<string>;
  onToggle: (path: string) => void;
  pathname: string;
};

function NodeList({
  nodes,
  depth,
  collapsed,
  onToggle,
  pathname,
}: NodeListProps) {
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
              >
                <ChevronIcon
                  className={`w-3 shrink-0 transition-transform ${
                    isCollapsed ? "" : "rotate-90"
                  }`}
                />
                {node.name}
              </Button>

              {!isCollapsed && (
                <NodeList
                  nodes={node.children}
                  depth={depth + 1}
                  collapsed={collapsed}
                  onToggle={onToggle}
                  pathname={pathname}
                />
              )}
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
              className={`block truncate rounded py-1.5 pr-2 hover:bg-foreground/10 ${
                isActive ? "bg-foreground/10" : ""
              }`}
            >
              {node.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
