"use client";

import { useRef, useState } from "react";
import { useHotkey } from "@/hooks/use-hotkey";
import { useListNavigation } from "@/hooks/use-list-navigation";
import type { GraphNode } from "@/lib/graph/model";
import { resultRowClass } from "@/components/ui/ResultRow";
import { TOOLBAR_CONTROL } from "@/components/graph/toolbar-chrome";
import { Text } from "@/components/ui/Text";

const MAX_RESULTS = 8;

export function GraphSearch({
  nodes,
  onSelect,
}: {
  nodes: GraphNode[];
  onSelect: (index: number) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useHotkey("/", (event) => {
    if (document.activeElement instanceof HTMLInputElement) return;
    event.preventDefault();
    inputRef.current?.focus();
  });

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? nodes
        .map((node, index) => ({ title: node.title, index }))
        .filter(({ title }) => title.toLowerCase().includes(needle))
        .sort((a, b) => {
          const aStarts = a.title.toLowerCase().startsWith(needle);
          const bStarts = b.title.toLowerCase().startsWith(needle);
          if (aStarts !== bStarts) return aStarts ? -1 : 1;
          return a.title.localeCompare(b.title);
        })
        .slice(0, MAX_RESULTS)
    : [];

  const { highlighted, setActive, onKeyDown } = useListNavigation(
    matches.length,
    (position) => select(matches[position].index),
  );

  function reset() {
    setQuery("");
    setActive(0);
  }

  function select(index: number) {
    onSelect(index);
    reset();
    inputRef.current?.blur();
  }

  function onInputKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "Escape") {
      onKeyDown(event);
      return;
    }
    if (query === "") return;
    event.stopPropagation();
    reset();
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={onInputKeyDown}
        onBlur={reset}
        placeholder="Search notes  /"
        aria-label="Search notes"
        className={`${TOOLBAR_CONTROL} w-40 placeholder:opacity-50 focus:border-foreground/40 focus:outline-none`}
      />

      {matches.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-10 mt-2 w-64 rounded border border-foreground/15 bg-background/90 p-1 text-sm backdrop-blur"
        >
          {matches.map(({ title, index }, position) => (
            <li
              key={index}
              role="option"
              aria-selected={position === highlighted}
            >
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  select(index);
                }}
                onMouseEnter={() => setActive(position)}
                className={`${resultRowClass(position === highlighted)} truncate`}
              >
                <Text>{title}</Text>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
