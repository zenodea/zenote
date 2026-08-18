"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useHotkey } from "@/hooks/use-hotkey";
import { useLatestRef } from "@/hooks/use-latest-ref";
import { useFindRequest } from "@/lib/stores/commands";
import { scrollBehavior } from "@/lib/motion";
import { useFooterClaim, useFooterHost } from "@/lib/stores/footer";
import { Button } from "@/components/ui/Button";
import { ChevronIcon, CloseIcon } from "@/components/ui/Icons";
import { INPUT_CLASS } from "@/components/ui/Input";

const MATCH_HIGHLIGHT = "find-match";
const CURRENT_HIGHLIGHT = "find-current";

function supportsHighlights() {
  return typeof CSS !== "undefined" && "highlights" in CSS;
}

function clearHighlights() {
  if (!supportsHighlights()) return;
  CSS.highlights.delete(MATCH_HIGHLIGHT);
  CSS.highlights.delete(CURRENT_HIGHLIGHT);
}

function collectRanges(root: Node, needle: string, skip: Node | null): Range[] {
  const ranges: Range[] = [];
  const lower = needle.toLowerCase();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (skip?.contains(node)) continue;
    const haystack = (node.textContent ?? "").toLowerCase();
    let at = haystack.indexOf(lower);
    while (at !== -1) {
      const range = document.createRange();
      range.setStart(node, at);
      range.setEnd(node, at + needle.length);
      ranges.push(range);
      at = haystack.indexOf(lower, at + needle.length);
    }
  }

  return ranges;
}

export function FindBar() {
  return <FindBarInner key={usePathname()} />;
}

function FindBarInner() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [ranges, setRanges] = useState<Range[]>([]);
  const [index, setIndex] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function runSearch(needle: string) {
    if (!needle.trim()) {
      clearHighlights();
      setRanges([]);
      setIndex(0);
      return;
    }

    const root = barRef.current?.closest("main");
    if (!root) return;

    const found = collectRanges(root, needle, barRef.current);
    setRanges(found);
    setIndex(0);
    if (supportsHighlights()) {
      CSS.highlights.set(MATCH_HIGHLIGHT, new Highlight(...found));
    }
  }

  function close() {
    clearHighlights();
    setOpen(false);
    setRanges([]);
    setIndex(0);
  }

  function reveal() {
    if (!open) {
      setOpen(true);
      runSearch(query);
    }
    inputRef.current?.select();
  }

  useHotkey("mod+f", (event) => {
    event.preventDefault();
    reveal();
  });

  const request = useFindRequest();
  const seen = useRef(request);
  const latestReveal = useLatestRef(reveal);
  useEffect(() => {
    if (request === seen.current) return;
    seen.current = request;
    latestReveal.current();
  }, [request, latestReveal]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus({ preventScroll: true });
      inputRef.current?.select();
    }
  }, [open]);

  useEffect(() => {
    if (ranges.length === 0) {
      if (supportsHighlights()) CSS.highlights.delete(CURRENT_HIGHLIGHT);
      return;
    }

    const current = ranges[Math.min(index, ranges.length - 1)];
    if (supportsHighlights()) {
      CSS.highlights.set(CURRENT_HIGHLIGHT, new Highlight(current));
    }
    current.startContainer.parentElement?.scrollIntoView({
      block: "center",
      behavior: scrollBehavior(),
    });
  }, [ranges, index]);

  useEffect(() => clearHighlights, []);

  function step(delta: number) {
    if (ranges.length === 0) return;
    setIndex((current) => (current + delta + ranges.length) % ranges.length);
  }

  const host = useFooterHost();
  const holds = useFooterClaim("find", open);

  if (!open || !host || !holds) return null;

  return createPortal(
    <div
      ref={barRef}
      className="absolute inset-0 flex items-center gap-2 px-4 text-sm"
    >
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          runSearch(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") step(event.shiftKey ? -1 : 1);
          if (event.key === "Escape") close();
        }}
        placeholder="Find in page…"
        aria-label="Find in page"
        className={`${INPUT_CLASS} h-7 min-w-0 flex-1`}
      />
      {query.trim() && (
        <span className="shrink-0 text-xs tabular-nums opacity-60">
          {ranges.length === 0
            ? "No matches"
            : `${index + 1} of ${ranges.length}`}
        </span>
      )}
      <Button
        onClick={() => step(-1)}
        disabled={ranges.length === 0}
        aria-label="Previous match"
        className="shrink-0"
      >
        <ChevronIcon className="-rotate-90" />
      </Button>
      <Button
        onClick={() => step(1)}
        disabled={ranges.length === 0}
        aria-label="Next match"
        className="shrink-0"
      >
        <ChevronIcon className="rotate-90" />
      </Button>
      <Button onClick={close} aria-label="Close find bar" className="shrink-0">
        <CloseIcon />
      </Button>
    </div>,
    host,
  );
}
