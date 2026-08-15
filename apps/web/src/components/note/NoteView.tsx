"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteNote, renameNote } from "@/app/actions/notes";
import type { Backlink } from "@/lib/backlinks";
import type { Graph } from "@/lib/graph/model";
import type { Note } from "@/lib/server/notes";
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
import { beginPageFade } from "@/lib/page-fade";

export function NoteView({
  note,
  slug,
  resolver,
  linkTitles,
  backlinks,
  neighbourhood,
}: {
  note: Note | null;
  slug: string;
  resolver: Record<string, string>;
  /** Titles of all vault notes, for the editor's `[[` autocomplete. */
  linkTitles: string[];
  backlinks: Backlink[];
  neighbourhood: Graph;
}) {
  const router = useRouter();
  const settings = useSettings();
  const autosave = useAutosave(slug, note?.updated ?? "");

  // Empty notes open in the editor; else the setting decides, pencil overrides.
  const [startedEmpty] = useState(note?.body === "");
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [readingOverride, setReadingOverride] = useState<boolean | null>(null);
  const vimBarRef = useRef<HTMLDivElement>(null);
  const reading =
    readingOverride ?? (startedEmpty ? false : !settings.openInEditMode);

  // What the note actually says right now. The prop is only as fresh as the
  // last server render and the editor is never remounted between modes, so
  // reading straight from it shows the note as it was before this sitting.
  // A new revision from the server supersedes what we are holding.
  const typed = useRef<{ revision: string; body: string } | null>(null);
  const revision = `${slug}\u0000${note?.updated ?? ""}`;
  const [held, setHeld] = useState({ revision, body: note?.body ?? "" });
  if (held.revision !== revision) setHeld({ revision, body: note?.body ?? "" });
  const body = held.body;
  const resolverMap = useMemo(
    () => new Map(Object.entries(resolver)),
    [resolver],
  );
  const linkTargets = useMemo(
    () => [...new Set(linkTitles)].sort((a, b) => a.localeCompare(b)),
    [linkTitles],
  );

  if (!note) return <NoteMissing slug={slug} />;

  function toggleReading() {
    const next = !reading;
    setReadingOverride(next);
    if (!next) return;

    const draft = typed.current;
    if (draft?.revision === revision) setHeld({ revision, body: draft.body });

    // Leaving the editor: land the save, then pick the note back up from the
    // server so its tags, backlinks and neighbourhood match the new body.
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
    beginPageFade();
    router.push(`/notes/${next}`);
  }

  async function submitDelete() {
    setDeleting(false);
    autosave.discard();

    const { error } = await deleteNote(slug);
    if (error) {
      alert(error);
      return;
    }
    beginPageFade();
    router.push("/");
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
                resolver={resolverMap}
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

      {/* Vim's : and / prompts, in the same footer plane the find bar uses. */}
      {!reading && settings.vimMode && (
        <div
          data-seam="top"
          className="vim-bar absolute inset-x-0 bottom-0 border-t border-foreground/15 bg-background"
        >
          <div
            ref={vimBarRef}
            className="vim-statusbar flex h-11 items-center gap-2 px-4 font-mono text-xs"
          />
        </div>
      )}
    </>
  );
}
