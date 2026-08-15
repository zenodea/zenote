"use client";

import { useMemo } from "react";
import { createPersistentStore } from "../store";
import type { SearchDoc } from "../search";
import { filename, joinSlug } from "../slug";
import { noteTags } from "../tags";

type OverlayNote = {
  body?: string;
  hidden?: boolean;
  /** Set on move/rename tombstones; absent on plain deletes. */
  movedTo?: string;
};

type Overlay = {
  notes: Record<string, OverlayNote>;
  folders: string[];
};

const EMPTY_OVERLAY: Overlay = { notes: {}, folders: [] };

export const VAULT_STORAGE_KEY = "vault-overlay";

const store = createPersistentStore(VAULT_STORAGE_KEY, EMPTY_OVERLAY);

export const useOverlay = store.use;

export function createNote(slug: string, body = "") {
  const { notes } = store.get();
  store.patch({ notes: { ...notes, [slug]: { body } } });
}

export function createFolder(path: string) {
  const { folders } = store.get();
  if (folders.includes(path)) return;
  store.patch({ folders: [...folders, path] });
}

export function updateNote(slug: string, body: string) {
  const { notes } = store.get();
  store.patch({ notes: { ...notes, [slug]: { ...notes[slug], body } } });
}

export function revertNote(slug: string) {
  const notes = { ...store.get().notes };
  delete notes[slug];
  store.patch({ notes });
}

type RelocateOptions = { body: string; isBaseNote: boolean };

function relocate(slug: string, next: string, options: RelocateOptions) {
  if (next === slug) return;

  const notes = { ...store.get().notes };

  // Base notes leave a tombstone; overlay-only notes just move.
  if (options.isBaseNote) notes[slug] = { hidden: true, movedTo: next };
  else delete notes[slug];
  notes[next] = { body: options.body };
  store.patch({ notes });
}

export function moveNote(
  slug: string,
  folder: string,
  options: RelocateOptions,
) {
  relocate(slug, joinSlug(folder, filename(slug)), options);
}

export function renameNote(
  slug: string,
  next: string,
  options: RelocateOptions,
) {
  relocate(slug, next, options);
}

export function deleteNote(slug: string, isBaseNote: boolean) {
  const notes = { ...store.get().notes };
  if (isBaseNote) notes[slug] = { hidden: true };
  else delete notes[slug];
  store.patch({ notes });
}

export function discardOverlay() {
  store.set(EMPTY_OVERLAY);
}

function isLocalNote(note: OverlayNote): boolean {
  return !note.hidden && note.body !== undefined;
}

// Moves count once via their copy; delete tombstones count themselves.
function overlayChangeCount(overlay: Overlay): number {
  const changes = Object.values(overlay.notes).filter(
    (note) => note.body !== undefined || (note.hidden && !note.movedTo),
  ).length;
  return changes + overlay.folders.length;
}

function overlayDoc(slug: string, body: string): SearchDoc {
  return {
    slug,
    title: filename(slug),
    tags: noteTags({ slug, title: "", tags: [], created: null, body }),
    body,
  };
}

export function useLocalNoteSlugs(): string[] {
  const overlay = useOverlay();

  return useMemo(
    () =>
      Object.entries(overlay.notes)
        .filter(([, note]) => isLocalNote(note))
        .map(([slug]) => slug),
    [overlay],
  );
}

export function useVaultDocs(base: SearchDoc[]): {
  docs: SearchDoc[];
  folders: string[];
  modified: Set<string>;
  changeCount: number;
} {
  const overlay = useOverlay();

  return useMemo(() => {
    const docs: SearchDoc[] = [];
    const seen = new Set<string>();

    for (const doc of base) {
      seen.add(doc.slug);
      const local = overlay.notes[doc.slug];
      if (local?.hidden) continue;
      docs.push(
        local?.body !== undefined ? overlayDoc(doc.slug, local.body) : doc,
      );
    }
    for (const [slug, local] of Object.entries(overlay.notes)) {
      if (seen.has(slug) || !isLocalNote(local)) continue;
      docs.push(overlayDoc(slug, local.body!));
    }

    return {
      docs,
      folders: overlay.folders,
      modified: new Set(Object.keys(overlay.notes)),
      changeCount: overlayChangeCount(overlay),
    };
  }, [base, overlay]);
}
