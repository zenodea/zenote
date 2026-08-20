"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Note } from "@/lib/note";
import { noteTags } from "@/lib/tags";
import { Button, iconClass } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { EllipsisIcon, PencilIcon, ShapesIcon } from "@/components/ui/Icons";
import { SaveStatus } from "@/components/note/SaveStatus";
import { PageHeader } from "@/components/frame/PageHeader";
import { requestFind } from "@/lib/stores/commands";

export function NoteToolbar({
  note,
  reading,
  drawing = false,
  autoEditTitle,
  onToggleReading,
  onRenameTitle,
  onDelete,
}: {
  note: Note;
  reading: boolean;
  drawing?: boolean;
  autoEditTitle: boolean;
  onToggleReading: () => void;
  onRenameTitle: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(autoEditTitle);
  const [draft, setDraft] = useState(note.title);
  const committed = useRef(false);
  const selectAll = useRef(autoEditTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    if (selectAll.current) {
      selectAll.current = false;
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    if (committed.current) return;
    committed.current = true;
    setEditing(false);
    onRenameTitle(draft);
  }

  function cancel() {
    committed.current = true;
    setEditing(false);
    setDraft(note.title);
  }

  const title =
    !reading && editing ? (
      <span className="grid max-w-full">
        <span
          aria-hidden
          className="invisible col-start-1 row-start-1 overflow-hidden whitespace-pre pr-0.5"
        >
          {draft || " "}
        </span>
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
            if (event.key === "Escape") cancel();
          }}
          onBlur={commit}
          aria-label="Note title"
          className="col-start-1 row-start-1 w-full min-w-0 bg-transparent focus:outline-none"
        />
      </span>
    ) : reading ? (
      note.title
    ) : (
      <button
        type="button"
        onClick={() => {
          committed.current = false;
          setDraft(note.title);
          setEditing(true);
        }}
        title="Rename note"
        className="block w-full min-w-0 cursor-text truncate rounded text-left hover:bg-foreground/5"
      >
        {note.title}
      </button>
    );

  return (
    <PageHeader
      title={title}
      meta={
        <>
          {drawing && (
            <span className="flex shrink-0 items-center gap-1 bg-foreground/10 px-2 py-0.5 text-xs">
              <ShapesIcon />
              Drawing
            </span>
          )}
          <span className="hidden md:contents">
            <time dateTime={note.created} className="shrink-0">
              {new Date(note.created).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
            {noteTags(note).map((tag) => (
              <Link
                key={tag}
                href={`/tags/${tag}`}
                className="shrink-0 rounded-full bg-foreground/10 px-2 py-0.5 text-xs hover:opacity-70"
              >
                #{tag}
              </Link>
            ))}
          </span>
          <SaveStatus />
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
              onClick={requestFind}
              className="block w-full rounded px-2.5 py-1.5 text-left hover:bg-foreground/10"
            >
              Find in page…
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="block w-full rounded px-2.5 py-1.5 text-left text-[#ef4444] hover:bg-foreground/10"
            >
              Delete
            </button>
          </Dropdown>
        </>
      }
    />
  );
}
