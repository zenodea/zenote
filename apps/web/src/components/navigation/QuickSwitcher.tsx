"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fuzzyMatch, type SearchDoc } from "@/lib/search";
import { useVaultDocs } from "@/lib/vault";
import { TitleHighlight } from "@/components/navigation/SidebarSearch";
import { Modal } from "@/components/ui/Modal";
import { Scroller } from "@/components/ui/Scroller";

const MAX_RESULTS = 8;

// Cmd/Ctrl+K: jump to any note by fuzzy title from anywhere in the app.
export function QuickSwitcher({ docs }: { docs: SearchDoc[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();
  const vault = useVaultDocs(docs);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setOpen((current) => !current);
        setQuery("");
        setActive(0);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!open) return null;

  const needle = query.trim().toLowerCase().replace(/\s+/g, "");
  const matches = needle
    ? vault.docs
        .flatMap((doc) => {
          const match = fuzzyMatch(needle, doc.title.toLowerCase());
          return match ? [{ doc, ...match }] : [];
        })
        .sort(
          (a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title),
        )
        .slice(0, MAX_RESULTS)
    : [...vault.docs]
        .sort((a, b) => a.title.localeCompare(b.title))
        .slice(0, MAX_RESULTS)
        .map((doc) => ({ doc, score: 0, indices: null as number[] | null }));
  const highlighted = Math.min(active, Math.max(matches.length - 1, 0));

  function close() {
    setOpen(false);
    setQuery("");
    setActive(0);
  }

  function select(slug: string) {
    close();
    router.push(`/notes/${slug}`);
  }

  return (
    <Modal title="Jump to note" onClose={close} className="max-w-xl">
      <input
        autoFocus
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={(event) => {
          if (matches.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((highlighted + 1) % matches.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((highlighted - 1 + matches.length) % matches.length);
          } else if (event.key === "Enter") {
            event.preventDefault();
            select(matches[highlighted].doc.slug);
          }
        }}
        placeholder="Jump to note…"
        aria-label="Jump to note"
        className="mt-3 w-full rounded border border-foreground/15 bg-background px-2 py-1 placeholder:opacity-50 focus:border-foreground/40 focus:outline-none"
      />
      <Scroller className="mt-2 h-72">
        <ul role="listbox">
          {matches.map(({ doc, indices }, position) => {
            const folder = doc.slug.split("/").slice(0, -1).join("/");
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
                  className={`block w-full truncate rounded px-2 py-1.5 text-left ${
                    position === highlighted ? "bg-foreground/10" : ""
                  }`}
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
            <li className="px-2 py-1.5 opacity-50">No matches</li>
          )}
        </ul>
      </Scroller>
    </Modal>
  );
}
