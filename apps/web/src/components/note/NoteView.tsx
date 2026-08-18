"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Backlink } from "@/lib/backlinks";
import type { Graph } from "@/lib/graph/model";
import { stripTitleHeading } from "@/lib/note-body";
import { useSettings } from "@/lib/stores/settings";
import { Scroller } from "@/components/ui/Scroller";
import { Backlinks } from "@/components/note/Backlinks";
import { DeleteNoteModal } from "@/components/note/DeleteNoteModal";
import { MarkdownEditor } from "@/components/note/MarkdownEditor";
import { NoteGraph } from "@/components/note/NoteGraph";
import { NoteMarkdown } from "@/components/note/NoteMarkdown";
import { NoteMissing } from "@/components/note/NoteMissing";
import { NoteToolbar } from "@/components/note/NoteToolbar";
import { RenameNoteModal } from "@/components/note/RenameNoteModal";
import { useAutosave } from "@/components/note/use-autosave";
import { VimPrompt } from "@/components/note/VimPrompt";
import { navigate } from "@/lib/navigation";
import { setEditingNote } from "@/lib/vault/editing";
import { deleteNote, renameNote } from "@/lib/vault/mutations";
import type { LocalNote } from "@/lib/vault/types";
import type { WikilinkResolver } from "@/lib/wikilinks";

export function NoteView({
  note,
  slug,
  resolver,
  linkTitles,
  backlinks,
  neighbourhood,
}: {
  note: LocalNote | null;
  slug: string;
  resolver: WikilinkResolver;
  linkTitles: string[];
  backlinks: Backlink[];
  neighbourhood: Graph;
}) {
  const settings = useSettings();
  const autosave = useAutosave(slug);

  const [startedEmpty] = useState(note?.body === "");
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [readingOverride, setReadingOverride] = useState<boolean | null>(null);
  const vimBarRef = useRef<HTMLDivElement>(null);
  const reading =
    readingOverride ?? (startedEmpty ? false : !settings.openInEditMode);

  const typed = useRef<{ revision: string; body: string } | null>(null);
  const revision = `${slug}\u0000${note?.updated ?? ""}\u0000${note?.localRev ?? 0}`;
  const [held, setHeld] = useState({ revision, body: note?.body ?? "" });
  if (held.revision !== revision) setHeld({ revision, body: note?.body ?? "" });
  const body = held.body;
  const linkTargets = useMemo(
    () => [...new Set(linkTitles)].sort((a, b) => a.localeCompare(b)),
    [linkTitles],
  );

  const noteId = note?.id ?? null;
  useEffect(() => {
    setEditingNote(reading ? null : noteId);
    return () => setEditingNote(null);
  }, [reading, noteId]);

  if (!note) return <NoteMissing slug={slug} />;

  function toggleReading() {
    const next = !reading;
    setReadingOverride(next);
    if (!next) return;

    const draft = typed.current;
    if (draft?.revision === revision) setHeld({ revision, body: draft.body });

    void autosave.publish();
  }

  async function submitRename(next: string | null) {
    setRenaming(false);
    if (!next || next === slug) return;

    await autosave.flush();
    const { error } = await renameNote(slug, next);
    if (error) {
      alert(error);
      return;
    }
    navigate(`/notes/${next}`);
  }

  async function submitDelete() {
    setDeleting(false);
    autosave.discard();

    const { error } = await deleteNote(slug);
    if (error) {
      alert(error);
      return;
    }
    navigate("/");
  }

  return (
    <>
      <NoteToolbar
        note={note}
        reading={reading}
        onToggleReading={toggleReading}
        onRename={() => setRenaming(true)}
        onDelete={() => setDeleting(true)}
      />

      <Scroller className="min-h-0 flex-1">
        <article className="mx-auto w-full max-w-3xl px-6 py-12">
          {reading ? (
            <div className="prose max-w-none">
              <NoteMarkdown
                source={stripTitleHeading({ ...note, body })}
                resolver={resolver}
              />
            </div>
          ) : (
            <MarkdownEditor
              key={slug}
              initialBody={body}
              onChange={(next) => {
                typed.current = { revision, body: next };
                autosave.change(next);
              }}
              linkTargets={linkTargets}
              vimMode={settings.vimMode}
              vimStatusBar={() => vimBarRef.current}
            />
          )}

          {reading && <NoteGraph graph={neighbourhood} focusId={slug} />}

          {reading && <Backlinks backlinks={backlinks} />}
        </article>
      </Scroller>

      {renaming && (
        <RenameNoteModal
          slug={slug}
          onClose={() => setRenaming(false)}
          onSubmit={submitRename}
        />
      )}

      {deleting && (
        <DeleteNoteModal
          title={note.title}
          onClose={() => setDeleting(false)}
          onConfirm={submitDelete}
        />
      )}

      {!reading && settings.vimMode && <VimPrompt hostRef={vimBarRef} />}
    </>
  );
}
