"use client";

import { useState } from "react";
import Link from "next/link";
import { SEARCH_MODES, type SearchMode, type SearchResult } from "@/lib/search";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { ChevronIcon } from "@/components/ui/Icons";
import { Segmented } from "@/components/ui/Segmented";

const TAG_LIST_LIMIT = 100;

// The sidebar's search panel: mode toggle, tag filters and ranked results.
export function SidebarSearch({
  mode,
  onModeChange,
  allTags,
  activeTags,
  onToggleTag,
  searching,
  results,
  pathname,
}: {
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  allTags: string[];
  activeTags: string[];
  onToggleTag: (tag: string) => void;
  searching: boolean;
  results: SearchResult[];
  pathname: string;
}) {
  return (
    <>
      <Segmented
        options={SEARCH_MODES}
        value={mode}
        onChange={onModeChange}
        ariaLabel="Search in"
        className="mb-3"
      />
      {allTags.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <TagPicker
            allTags={allTags}
            activeTags={activeTags}
            onToggle={onToggleTag}
          />
          {activeTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleTag(tag)}
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
  );
}

function TagPicker({
  allTags,
  activeTags,
  onToggle,
}: {
  allTags: string[];
  activeTags: string[];
  onToggle: (tag: string) => void;
}) {
  const [filter, setFilter] = useState("");
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
          onChange={(event) => setFilter(event.target.value)}
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
