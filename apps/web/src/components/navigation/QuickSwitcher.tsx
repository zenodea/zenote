"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  closeSwitcher,
  toggleSwitcher,
  useSwitcherOpen,
} from "@/lib/stores/commands";
import { fuzzyMatch, type NoteRef } from "@/lib/search";
import { folder as folderOf } from "@/lib/slug";
import { useHotkey } from "@/hooks/use-hotkey";
import { useListNavigation } from "@/hooks/use-list-navigation";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  EmptyResults,
  TitleHighlight,
  resultRowClass,
} from "@/components/ui/ResultRow";
import { Scroller } from "@/components/ui/Scroller";
import { beginPageFade } from "@/lib/page-fade";

const MAX_RESULTS = 8;

export function QuickSwitcher({ docs }: { docs: NoteRef[] }) {
  const open = useSwitcherOpen();

  useHotkey("mod+k", (event) => {
    event.preventDefault();
    toggleSwitcher();
  });

  if (!open) return null;
  return <SwitcherPanel docs={docs} onClose={closeSwitcher} />;
}

function SwitcherPanel({
  docs,
  onClose,
}: {
  docs: NoteRef[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const needle = query.trim().toLowerCase().replace(/\s+/g, "");
  const matches = needle
    ? docs
        .flatMap((doc) => {
          const match = fuzzyMatch(needle, doc.title.toLowerCase());
          return match ? [{ doc, ...match }] : [];
        })
        .sort(
          (a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title),
        )
        .slice(0, MAX_RESULTS)
    : [...docs]
        .sort((a, b) => a.title.localeCompare(b.title))
        .slice(0, MAX_RESULTS)
        .map((doc) => ({ doc, score: 0, indices: null as number[] | null }));

  function select(slug: string) {
    onClose();
    beginPageFade();
    router.push(`/notes/${slug}`);
  }

  const { highlighted, setActive, onKeyDown } = useListNavigation(
    matches.length,
    (index) => select(matches[index].doc.slug),
  );

  return (
    <Modal title="Jump to note" onClose={onClose} className="max-w-xl">
      <Input
        autoFocus
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        placeholder="Jump to note…"
        aria-label="Jump to note"
        className="mt-3 w-full"
      />
      <Scroller className="mt-2 h-72">
        <ul role="listbox">
          {matches.map(({ doc, indices }, position) => {
            const folder = folderOf(doc.slug);
            return (
              <li
                key={doc.slug}
                role="option"
                aria-selected={position === highlighted}
              >
                <button
                  type="button"
                  // Mousedown, not click: click fires after blur re-renders.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    select(doc.slug);
                  }}
                  onMouseEnter={() => setActive(position)}
                  className={`${resultRowClass(position === highlighted)} truncate`}
                >
                  <TitleHighlight title={doc.title} indices={indices} />
                  {folder && (
                    <span className="ml-2 text-xs opacity-50">{folder}</span>
                  )}
                </button>
              </li>
            );
          })}
          {matches.length === 0 && (
            <li>
              <EmptyResults />
            </li>
          )}
        </ul>
      </Scroller>
    </Modal>
  );
}
