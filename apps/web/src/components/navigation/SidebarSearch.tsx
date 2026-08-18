"use client";

import { useState } from "react";
import Link from "next/link";
import { SEARCH_MODES, type SearchMode, type SearchResult } from "@/lib/search";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { ChevronIcon } from "@/components/ui/Icons";
import { Input } from "@/components/ui/Input";
import {
  EmptyResults,
  TitleHighlight,
  resultRowClass,
} from "@/components/ui/ResultRow";
import { Scroller } from "@/components/ui/Scroller";
import { Segmented } from "@/components/ui/Segmented";

const TAG_LIST_LIMIT = 100;

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
        <Input
          autoFocus
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Find tag…"
          aria-label="Find tag"
          className="mb-1 w-full text-xs"
        />
      )}
      <Scroller className="max-h-60">
        <ul>
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
            <li>
              <EmptyResults>No tags found</EmptyResults>
            </li>
          )}
        </ul>
      </Scroller>
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
              prefetch={false}
              aria-current={pathname === href ? "page" : undefined}
              className={resultRowClass(pathname === href)}
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
