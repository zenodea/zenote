"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Backlink } from "@/lib/backlinks";
import type { Graph } from "@/lib/graph/model";
import type { Note } from "@/lib/server/notes";
import { stripTitleHeading } from "@/lib/note-body";
import { filename } from "@/lib/slug";
import { useSettings } from "@/lib/stores/settings";
import {
  deleteNote,
  renameNote,
  updateNote,
  useLocalNoteSlugs,
  useOverlay,
} from "@/lib/stores/vault";
import { Scroller } from "@/components/ui/Scroller";
import { Backlinks } from "@/components/note/Backlinks";
import { DeleteNoteModal } from "@/components/note/DeleteNoteModal";
import { MarkdownEditor } from "@/components/note/MarkdownEditor";
import { NoteGraph } from "@/components/note/NoteGraph";
import { NoteMarkdown } from "@/components/note/NoteMarkdown";
import { NoteMissing } from "@/components/note/NoteMissing";
import { NoteToolbar } from "@/components/note/NoteToolbar";
import { RenameNoteModal } from "@/components/note/RenameNoteModal";

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
  const overlay = useOverlay();
  const localSlugs = useLocalNoteSlugs();
  const settings = useSettings();
  const local = overlay.notes[slug];
  const body = local?.hidden ? undefined : (local?.body ?? note?.body);

  // Empty notes open in the editor; else the setting decides, pencil overrides.
  const [startedEmpty] = useState(body === "");
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [readingOverride, setReadingOverride] = useState<boolean | null>(null);
  const vimBarRef = useRef<HTMLDivElement>(null);
  const reading =
    readingOverride ?? (startedEmpty ? false : !settings.openInEditMode);
  const resolverMap = useMemo(
    () => new Map(Object.entries(resolver)),
    [resolver],
  );
  const linkTargets = useMemo(() => {
    const titles = new Set(linkTitles);
    for (const localSlug of localSlugs) titles.add(filename(localSlug));
    return [...titles].sort((a, b) => a.localeCompare(b));
  }, [linkTitles, localSlugs]);

  if (body === undefined) {
    return (
      <NoteMissing
        slug={slug}
        deletedLocally={Boolean(local?.hidden && !local.movedTo && note)}
      />
    );
  }

  const effective: Note = note
    ? { ...note, body }
    : { slug, title: filename(slug), tags: [], created: null, body };

  function submitRename(next: string | null) {
    setRenaming(false);
    if (!next || next === slug) return;
    renameNote(slug, next, { body: effective.body, isBaseNote: note !== null });
    router.push(`/notes/${next}`);
  }

  function submitDelete() {
    setDeleting(false);
    deleteNote(slug, note !== null);
    router.push("/");
  }

  return (
    <>
      <NoteToolbar
        note={effective}
        slug={slug}
        isLocal={local?.body !== undefined}
        hasBaseNote={note !== null}
        reading={reading}
        onToggleReading={() => setReadingOverride(!reading)}
        onRename={() => setRenaming(true)}
        onDelete={() => setDeleting(true)}
      />

      <Scroller className="min-h-0 flex-1">
        <article className="mx-auto w-full max-w-3xl px-6 py-12">
          {reading ? (
            <div className="prose max-w-none">
              <NoteMarkdown
                source={stripTitleHeading(effective)}
                resolver={resolverMap}
              />
            </div>
          ) : (
            // Keyed so toggling back in re-reads the current overlay body.
            <MarkdownEditor
              key={slug}
              initialBody={body}
              onChange={(next) => updateNote(slug, next)}
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
          title={effective.title}
          restorable={note !== null}
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
