"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronIcon } from "@/components/ui/Icons";
import { useLayoutMode } from "@/hooks/use-media-query";

export function DrawingLinks({
  notes,
}: {
  notes: { slug: string; title: string }[];
}) {
  const phone = useLayoutMode() === "phone";
  const [open, setOpen] = useState<boolean | null>(null);
  const shown = open ?? !phone;

  if (notes.length === 0) return null;

  return (
    <div className="pointer-events-none absolute right-3 top-3 z-10 flex max-w-[min(15rem,60%)] flex-col items-end">
      <button
        type="button"
        onClick={() => setOpen(!shown)}
        aria-expanded={shown}
        className="pointer-events-auto flex items-center gap-1.5 rounded border border-foreground/15 bg-background/90 px-2 py-1 text-xs backdrop-blur hover:bg-background"
      >
        <span aria-hidden className="size-1.5 rotate-45 border border-accent" />
        {notes.length === 1 ? "1 link" : `${notes.length} links`}
        <ChevronIcon
          className={`w-2.5 transition-transform ${shown ? "rotate-90" : ""}`}
        />
      </button>

      {shown && (
        <ul className="pointer-events-auto mt-1 w-full overflow-hidden rounded border border-foreground/15 bg-background/90 text-xs backdrop-blur">
          {notes.map((note) => (
            <li key={note.slug}>
              <Link
                href={`/notes/${note.slug}`}
                prefetch={false}
                className="block truncate px-2 py-1.5 hover:bg-foreground/10 hover:text-accent"
              >
                {note.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
