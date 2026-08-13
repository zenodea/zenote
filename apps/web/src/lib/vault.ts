"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { SearchDoc } from "./search";
import { noteTags } from "./tags";

type OverlayNote = {
  body?: string;
  hidden?: boolean;
};

type Overlay = {
  notes: Record<string, OverlayNote>;
  folders: string[];
};

const EMPTY_OVERLAY: Overlay = { notes: {}, folders: [] };

export const VAULT_STORAGE_KEY = "vault-overlay";

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

export function moveNote(
  slug: string,
  folder: string,
  options: {
    body: string;
    isBaseNote: boolean;
  },
) {
  const filename = slug.split("/").pop()!;
  const next = folder ? `${folder}/${filename}` : filename;
  if (next === slug) return;

  const overlay = getOverlay();
  const notes = { ...overlay.notes };

  if (options.isBaseNote) notes[slug] = { hidden: true };
  else delete notes[slug];
  notes[next] = { body: options.body };
  writeOverlay({ ...overlay, notes });
}

export function discardOverlay() {
  writeOverlay(EMPTY_OVERLAY);
}

export function overlayChangeCount(overlay: Overlay): number {
  const tombstones = Object.values(overlay.notes).filter(
    (note) => note.hidden,
  ).length;
  return (
    Object.keys(overlay.notes).length - tombstones + overlay.folders.length
  );
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
