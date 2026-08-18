"use client";

import { filename, folder as parentOf, joinSlug } from "../slug";
import { applyWrite } from "./apply";
import { planLinkRewrites, type SlugRename } from "./rewrite-links";
import { getBySlug, vaultStore } from "./store";
import { requestPush } from "./sync";
import type { LocalFolder, LocalNote, Tombstone } from "./types";

export type ActionResult = { error?: string };

function bump(note: LocalNote, changes: Partial<LocalNote>): LocalNote {
  return {
    ...note,
    ...changes,
    pending: note.pending === "create" ? "create" : "update",
    localRev: note.localRev + 1,
  };
}

function bumpFolder(folder: LocalFolder, path: string): LocalFolder {
  return {
    ...folder,
    path,
    pending: folder.pending === "create" ? "create" : "update",
  };
}

export async function createNote(
  slug: string,
): Promise<ActionResult & { id?: string }> {
  if (getBySlug().has(slug)) return { error: `“${slug}” already exists.` };

  const id = crypto.randomUUID();
  await applyWrite({
    notes: [
      {
        id,
        slug,
        title: filename(slug),
        tags: [],
        created: new Date().toISOString(),
        updated: "",
        body: "",
        pending: "create",
        localRev: 1,
      },
    ],
  });
  requestPush();
  return { id };
}

export async function saveBody(slug: string, body: string): Promise<void> {
  const note = getBySlug().get(slug);
  if (!note || note.body === body) return;

  await applyWrite({ notes: [bump(note, { body })] });
  requestPush();
}

async function relocateNote(
  slug: string,
  next: string,
  retitle: boolean,
): Promise<ActionResult> {
  const note = getBySlug().get(slug);
  if (!note) return { error: `There is no note at “${slug}”.` };
  if (next === slug) return {};
  if (getBySlug().has(next)) return { error: `“${next}” already exists.` };

  const moved = bump(note, {
    slug: next,
    ...(retitle ? { title: filename(next) } : {}),
  });

  await applyRenames([moved], [{ from: slug, to: next }]);
  requestPush();
  return {};
}

export const renameNote = (slug: string, next: string) =>
  relocateNote(slug, next, true);

export const moveNote = (slug: string, folder: string) =>
  relocateNote(slug, joinSlug(folder, filename(slug)), false);

async function applyRenames(
  staged: LocalNote[],
  renames: SlugRename[],
): Promise<void> {
  const updates = new Map(staged.map((note) => [note.id, note]));
  const after = vaultStore
    .get()
    .notes.map((note) => updates.get(note.id) ?? note);

  for (const rewrite of planLinkRewrites(after, renames)) {
    const held = updates.get(rewrite.id);
    if (held) {
      updates.set(rewrite.id, { ...held, body: rewrite.body });
      continue;
    }
    const note = after.find((entry) => entry.id === rewrite.id);
    if (note) updates.set(rewrite.id, bump(note, { body: rewrite.body }));
  }

  await applyWrite({ notes: [...updates.values()] });
}

export async function deleteNote(slug: string): Promise<ActionResult> {
  const note = getBySlug().get(slug);
  if (!note) return {};

  const tombstones: Tombstone[] =
    note.pending === "create"
      ? []
      : [{ id: note.id, table: "notes", baseUpdated: note.updated }];

  await applyWrite({ deleteNotes: [note.id], tombstones });
  requestPush();
  return {};
}

export async function createFolder(path: string): Promise<ActionResult> {
  const { folders } = vaultStore.get();
  if (folders.some((folder) => folder.path === path)) {
    return { error: `“${path}” already exists.` };
  }

  await applyWrite({
    folders: [{ id: crypto.randomUUID(), path, pending: "create" }],
  });
  requestPush();
  return {};
}

type Move = { id: string; from: string; to: string };

function plan(
  rows: { id: string; path: string }[],
  prefix: string,
  to: string | null,
): { moves: Move[]; taken: string | null } {
  const moves: Move[] = [];
  const staying = new Set<string>();

  for (const row of rows) {
    if (!row.path.startsWith(prefix)) {
      staying.add(row.path);
      continue;
    }
    const rest = row.path.slice(prefix.length);
    moves.push({
      id: row.id,
      from: row.path,
      to: to === null ? rest : joinSlug(to, rest),
    });
  }

  const clash = moves.find((move) => staying.has(move.to));
  return { moves, taken: clash ? clash.to : null };
}

function reprefix(from: string, to: string | null) {
  const state = vaultStore.get();
  const prefix = `${from}/`;

  const noteRows = state.notes.map(({ id, slug }) => ({ id, path: slug }));
  const folderRows = state.folders.map(({ id, path }) => ({ id, path }));

  const moved = plan(noteRows, prefix, to);
  const nested = plan(folderRows, prefix, to);

  const taken = moved.taken ?? nested.taken;
  if (taken) return { error: `“${taken}” already exists.` as string };

  return { moved: moved.moves, nested: nested.moves };
}

async function applyReprefix(
  moved: Move[],
  nested: Move[],
  own: { folder?: LocalFolder; deleteFolders?: string[]; tombstones?: Tombstone[] },
): Promise<void> {
  const state = vaultStore.get();
  const notesById = new Map(state.notes.map((note) => [note.id, note]));
  const foldersById = new Map(
    state.folders.map((folder) => [folder.id, folder]),
  );

  const staged = moved.flatMap((move) => {
    const note = notesById.get(move.id);
    return note ? [bump(note, { slug: move.to })] : [];
  });

  const folders = nested.flatMap((move) => {
    const folder = foldersById.get(move.id);
    return folder ? [bumpFolder(folder, move.to)] : [];
  });
  if (own.folder) folders.push(own.folder);

  await applyRenames(
    staged,
    moved.map(({ from, to }) => ({ from, to })),
  );
  await applyWrite({
    folders,
    deleteFolders: own.deleteFolders,
    tombstones: own.tombstones,
  });
}

async function relocateFolder(
  path: string,
  next: string,
): Promise<ActionResult> {
  if (next === path) return {};
  if (next.startsWith(`${path}/`)) {
    return { error: "A folder cannot be moved inside itself." };
  }
  const { folders } = vaultStore.get();
  if (folders.some((folder) => folder.path === next)) {
    return { error: `“${next}” already exists.` };
  }

  const planned = reprefix(path, next);
  if ("error" in planned) return planned;

  const own = folders.find((folder) => folder.path === path);
  await applyReprefix(planned.moved, planned.nested, {
    folder: own ? bumpFolder(own, next) : undefined,
  });
  requestPush();
  return {};
}

export const moveFolder = (path: string, into: string) =>
  relocateFolder(path, joinSlug(into, filename(path)));

export const renameFolder = (path: string, name: string) =>
  relocateFolder(path, joinSlug(parentOf(path), name));

export async function deleteFolder(path: string): Promise<ActionResult> {
  const parent = parentOf(path);

  const planned = reprefix(path, parent || null);
  if ("error" in planned) return planned;

  const own = vaultStore.get().folders.find((folder) => folder.path === path);
  await applyReprefix(planned.moved, planned.nested, {
    deleteFolders: own ? [own.id] : undefined,
    tombstones:
      own && own.pending !== "create"
        ? [{ id: own.id, table: "folders", baseUpdated: null }]
        : undefined,
  });
  requestPush();
  return {};
}
