"use client";

import { useEffect, useState } from "react";
import { useLatestRef } from "@/hooks/use-latest-ref";

const OPEN_TARGET = /\[\[([^[\]|#]*)$/;
const LIMIT = 8;
const GAP = 6;
const WIDTH = 224;
const ROW = 28;

type Anchor = { left: number; top: number };

function insert(area: HTMLTextAreaElement, query: string, target: string) {
  const caret = area.selectionStart ?? area.value.length;
  const start = caret - query.length;
  const text = `${target}]]`;

  area.focus();
  area.setSelectionRange(start, caret);
  if (!document.execCommand("insertText", false, text)) {
    area.setRangeText(text, start, caret, "end");
    area.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

export function DrawingWikilinkSuggest({
  host,
  targets,
}: {
  host: HTMLElement | null;
  targets: string[];
}) {
  const [area, setArea] = useState<HTMLTextAreaElement | null>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [index, setIndex] = useState(0);

  const needle = query?.trim().toLowerCase() ?? "";
  const matches =
    query === null
      ? []
      : targets
          .filter((target) => target.toLowerCase().includes(needle))
          .slice(0, LIMIT);

  const latest = useLatestRef({ matches, index, query });

  useEffect(() => {
    if (host === null) return;
    const root: HTMLElement = host;

    let attached: HTMLTextAreaElement | null = null;

    function close() {
      setQuery(null);
      setAnchor(null);
      setIndex(0);
    }

    function refresh(editing: HTMLTextAreaElement) {
      const caret = editing.selectionStart ?? editing.value.length;
      const found = editing.value.slice(0, caret).match(OPEN_TARGET);
      if (!found) {
        close();
        return;
      }
      const rect = editing.getBoundingClientRect();
      setQuery(found[1]);
      setIndex(0);
      setAnchor({ left: rect.left, top: rect.bottom + GAP });
    }

    function onInput(event: Event) {
      if (event.target instanceof HTMLTextAreaElement) refresh(event.target);
    }

    function onKeyDown(event: KeyboardEvent) {
      const editing = event.target;
      if (!(editing instanceof HTMLTextAreaElement)) return;

      const open = latest.current;
      if (open.query === null || open.matches.length === 0) return;

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        const step = event.key === "ArrowDown" ? 1 : -1;
        const total = open.matches.length;
        setIndex((current) => (current + step + total) % total);
        return;
      }

      if (event.key === "Enter" || event.key === "Tab") {
        const chosen = open.matches[open.index];
        if (chosen === undefined) return;
        event.preventDefault();
        event.stopPropagation();
        insert(editing, open.query, chosen);
        close();
      }
    }

    function scan() {
      const editing = root.querySelector("textarea");
      if (!editing) {
        if (attached) {
          attached = null;
          setArea(null);
          close();
        }
        return;
      }
      if (editing === attached) return;

      attached = editing;
      setArea(editing);
      editing.addEventListener("input", onInput);
      editing.addEventListener("keydown", onKeyDown, true);
    }

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (attached) {
        attached.removeEventListener("input", onInput);
        attached.removeEventListener("keydown", onKeyDown, true);
      }
    };
  }, [host, latest]);

  if (area === null || query === null || anchor === null) return null;
  if (matches.length === 0) return null;

  return (
    <ul
      role="listbox"
      aria-label="Link a note"
      style={{
        left: Math.max(8, Math.min(anchor.left, window.innerWidth - WIDTH - 8)),
        top: Math.min(
          anchor.top,
          window.innerHeight - matches.length * ROW - 16,
        ),
        width: WIDTH,
      }}
      className="fixed z-50 max-h-64 overflow-auto rounded border border-foreground/15 bg-background p-1 text-sm shadow-lg"
    >
      {matches.map((target, at) => (
        <li key={target}>
          <button
            type="button"
            role="option"
            aria-selected={at === index}
            onMouseDown={(event) => {
              event.preventDefault();
              insert(area, query, target);
              setQuery(null);
              setAnchor(null);
            }}
            className={`block w-full truncate rounded px-2 py-1 text-left ${
              at === index
                ? "bg-foreground/10 text-accent"
                : "hover:bg-foreground/10"
            }`}
          >
            {target}
          </button>
        </li>
      ))}
    </ul>
  );
}
