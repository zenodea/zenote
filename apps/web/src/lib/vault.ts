"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { SearchDoc } from "./search";
import { noteTags } from "./tags";

// Local overlay over the read-only git vault; these mutations become
// Supabase Storage calls once notes move server-side.

/** "note.md" → "note"; rejects empty and path-escaping names. */
export function sanitizeName(raw: string): string | null {
  const name = raw
    .trim()
    .replace(/\.md$/i, "")
    .replace(/^\/+|\/+$/g, "");
  if (!name || name.split("/").some((s) => !s.trim() || s === "..")) {
    return null;
  }
  return name;
}
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

const VAULT_STORAGE_KEY = "vault-overlay";

const listeners = new Set<() => void>();

let cached: Overlay | null = null;

function readOverlay(): Overlay {
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (raw) return { ...EMPTY_OVERLAY, ...JSON.parse(raw) };
  } catch {
    // Corrupt blob or private browsing: treat as no local changes.
  }
  return EMPTY_OVERLAY;
}

function getOverlay(): Overlay {
  cached ??= readOverlay();
  return cached;
}

function writeOverlay(next: Overlay) {
  cached = next;
  try {
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing: the change just won't survive a reload.
  }
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function useOverlay(): Overlay {
  return useSyncExternalStore(subscribe, getOverlay, () => EMPTY_OVERLAY);
}

export function createNote(slug: string, body = "") {
  const overlay = getOverlay();
  writeOverlay({
    ...overlay,
    notes: { ...overlay.notes, [slug]: { body } },
  });
}

export function createFolder(path: string) {
  const overlay = getOverlay();
  if (overlay.folders.includes(path)) return;
  writeOverlay({ ...overlay, folders: [...overlay.folders, path] });
}

export function updateNote(slug: string, body: string) {
  const overlay = getOverlay();
  writeOverlay({
    ...overlay,
    notes: { ...overlay.notes, [slug]: { ...overlay.notes[slug], body } },
  });
}

export function revertNote(slug: string) {
  const overlay = getOverlay();
  const notes = { ...overlay.notes };
  delete notes[slug];
  writeOverlay({ ...overlay, notes });
}

type RelocateOptions = { body: string; isBaseNote: boolean };

function relocate(slug: string, next: string, options: RelocateOptions) {
  if (next === slug) return;

  const overlay = getOverlay();
  const notes = { ...overlay.notes };

  // Base notes leave a tombstone; overlay-only notes just move.
  if (options.isBaseNote) notes[slug] = { hidden: true, movedTo: next };
  else delete notes[slug];
  notes[next] = { body: options.body };
  writeOverlay({ ...overlay, notes });
}

export function moveNote(slug: string, folder: string, options: RelocateOptions) {
  const filename = slug.split("/").pop()!;
  relocate(slug, folder ? `${folder}/${filename}` : filename, options);
}

export function renameNote(slug: string, next: string, options: RelocateOptions) {
  relocate(slug, next, options);
}

export function deleteNote(slug: string, isBaseNote: boolean) {
  const overlay = getOverlay();
  const notes = { ...overlay.notes };
  if (isBaseNote) notes[slug] = { hidden: true };
  else delete notes[slug];
  writeOverlay({ ...overlay, notes });
}

export function discardOverlay() {
  writeOverlay(EMPTY_OVERLAY);
}

// Moves count once via their copy; delete tombstones count themselves.
function overlayChangeCount(overlay: Overlay): number {
  const entries = Object.values(overlay.notes);
  const changes = entries.filter(
    (note) => note.body !== undefined || (note.hidden && !note.movedTo),
  ).length;
  return changes + overlay.folders.length;
}

function overlayDoc(slug: string, body: string): SearchDoc {
  return {
    slug,
    title: slug.split("/").pop()!,
    tags: noteTags({ slug, title: "", tags: [], created: null, body }),
    body,
  };
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
      if (seen.has(slug) || local.hidden || local.body === undefined) continue;
      docs.push(overlayDoc(slug, local.body));
    }

    return {
      docs,
      folders: overlay.folders,
      modified: new Set(Object.keys(overlay.notes)),
      changeCount: overlayChangeCount(overlay),
    };
  }, [base, overlay]);
}
