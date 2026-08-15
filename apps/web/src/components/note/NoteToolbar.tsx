"use client";

import Link from "next/link";
import type { Note } from "@/lib/server/notes";
import { revertNote } from "@/lib/stores/vault";
import { noteTags } from "@/lib/tags";
import { Button, iconClass } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { EllipsisIcon, PencilIcon } from "@/components/ui/Icons";
import { PageHeader } from "@/components/frame/PageHeader";

export function NoteToolbar({
  note,
  slug,
  isLocal,
  hasBaseNote,
  reading,
  onToggleReading,
  onRename,
  onDelete,
}: {
  note: Note;
  slug: string;
  isLocal: boolean;
  hasBaseNote: boolean;
  reading: boolean;
  onToggleReading: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <PageHeader
      title={note.title}
      meta={
        <>
          {note.created && (
            <time dateTime={note.created} className="shrink-0">
              {new Date(note.created).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
          )}
          {noteTags(note).map((tag) => (
            <Link
              key={tag}
              href={`/tags/${tag}`}
              className="shrink-0 rounded-full bg-foreground/10 px-2 py-0.5 text-xs hover:opacity-70"
            >
              #{tag}
            </Link>
          ))}
          {isLocal && (
            <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
              {hasBaseNote ? "edited locally" : "local note"}
            </span>
          )}
          {isLocal && hasBaseNote && reading && (
            <button
              type="button"
              onClick={() => {
                if (confirm("Revert this note to the vault version?")) {
                  revertNote(slug);
                }
              }}
              className="shrink-0 text-xs opacity-60 hover:opacity-100"
            >
              Revert
            </button>
          )}
        </>
      }
      actions={
        <>
          <Button
            onClick={onToggleReading}
            active={!reading}
            aria-pressed={!reading}
            aria-label={reading ? "Edit note" : "Reading view"}
            title={reading ? "Edit note" : "Reading view"}
          >
            <PencilIcon />
          </Button>
          <Dropdown
            label={<EllipsisIcon />}
            ariaLabel="Note actions"
            triggerClassName={iconClass()}
          >
            <button
              type="button"
              onClick={onRename}
              className="block w-full rounded px-2 py-1 text-left hover:bg-foreground/10"
            >
              Rename…
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="block w-full rounded px-2 py-1 text-left text-[#ef4444] hover:bg-foreground/10"
            >
              Delete
            </button>
          </Dropdown>
        </>
      }
    />
  );
}
