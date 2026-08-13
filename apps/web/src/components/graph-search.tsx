"use client";

import { useEffect, useRef, useState } from "react";
import type { GraphNode } from "@/lib/graph";
import { Text } from "@/components/text";

const MAX_RESULTS = 8;

type GraphSearchProps = {
  nodes: GraphNode[];
  /** Called with the node's index in `nodes`. */
  onSelect: (index: number) => void;
  inputClass: string;
};

/**
 * Title search over the graph's nodes. Renders inside the (positioned)
 * control row; the result list anchors below the input.
 */
export function GraphSearch({ nodes, onSelect, inputClass }: GraphSearchProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" jumps to the search box from anywhere on the page.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const typing = document.activeElement instanceof HTMLInputElement;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
  const highlighted = Math.min(active, Math.max(matches.length - 1, 0));

  function select(index: number) {
    onSelect(index);
    setQuery("");
    setActive(0);
    inputRef.current?.blur();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      // Only swallow the key while a search is in progress; otherwise let it
      // bubble so the graph's own Escape (clear focus) still works.
      if (query === "") return;
      event.stopPropagation();
      setQuery("");
      setActive(0);
      return;
    }
    if (matches.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((highlighted + 1) % matches.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((highlighted - 1 + matches.length) % matches.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      select(matches[highlighted].index);
    }
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
        onKeyDown={onKeyDown}
        onBlur={() => {
          setQuery("");
          setActive(0);
        }}
        placeholder="Search notes  /"
        aria-label="Search notes"
        className={`${inputClass} w-40 placeholder:opacity-50 focus:outline-none focus:border-foreground/40`}
      />

      {matches.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-10 mt-2 w-64 rounded border border-foreground/15 bg-background/90 p-1 text-sm backdrop-blur"
        >
          {matches.map(({ title, index }, position) => (
            <li key={index} role="option" aria-selected={position === highlighted}>
              <button
                type="button"
                // Mousedown, not click: click fires after blur has already
                // emptied the query and unmounted this list.
                onMouseDown={(event) => {
                  event.preventDefault();
                  select(index);
                }}
                onMouseEnter={() => setActive(position)}
                className={`block w-full truncate rounded px-2 py-1 text-left ${
                  position === highlighted ? "bg-foreground/10" : ""
                }`}
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
