"use client";

import { filename } from "../slug";
import { applyWrite } from "./apply";
import {
  clean,
  conflictSlug,
  rebaseKeepingLocal,
  resolveConflict,
  takenChecker,
} from "./conflicts";
import type { VaultWrite } from "./db";
import { dirtyEditingId } from "./editing";
import { fetchNotesById, readServerFolders, readServerManifest } from "./remote";
import { getBySlug, vaultStore } from "./store";

export async function pull(): Promise<void> {
  const vaultId = vaultStore.get().vault?.id;
  if (!vaultId) return;

  const [manifest, serverFolders] = await Promise.all([
    readServerManifest(vaultId),
    readServerFolders(vaultId),
  ]);

  const state = vaultStore.get();
  if (state.vault?.id !== vaultId) return;
  const byId = new Map(state.notes.map((note) => [note.id, note]));
  const tombstoned = new Set(state.tombstones.map((row) => row.id));

  const toFetch: string[] = [];
  for (const row of manifest) {
    if (tombstoned.has(row.id)) continue;
    const held = byId.get(row.id);
    if (!held) toFetch.push(row.id);
    else if (held.updated !== row.updated_at && held.pending !== "create") {
      toFetch.push(row.id);
    }
  }

  const fetched = await fetchNotesById(toFetch);

  const latest = vaultStore.get();
  if (latest.vault?.id !== vaultId) return;
  const latestById = new Map(latest.notes.map((note) => [note.id, note]));
  const manifestIds = new Set(manifest.map((row) => row.id));
  const { taken, claim } = takenChecker();

  const batch: Required<VaultWrite> = {
    notes: [],
    deleteNotes: [],
    folders: [],
    deleteFolders: [],
    tombstones: [],
    deleteTombstones: [],
  };

  for (const note of fetched) {
    const held = latestById.get(note.id);

    if (held && held.id === dirtyEditingId() && held.updated !== note.updated) {
      for (const row of rebaseKeepingLocal(held, note, taken)) {
        claim(row.slug);
        batch.notes.push(row);
      }
      continue;
    }

    if (held && held.pending !== null && held.updated !== note.updated) {
      for (const row of resolveConflict(held, note, taken)) {
        claim(row.slug);
        batch.notes.push(row);
      }
      continue;
    }
    if (held && held.pending !== null) continue;

    const squatter = getBySlug().get(note.slug);
    if (squatter && squatter.id !== note.id && squatter.pending === "create") {
      const slug = conflictSlug(note.slug, taken);
      claim(slug);
      batch.notes.push({
        ...squatter,
        slug,
        title: filename(slug),
        localRev: squatter.localRev + 1,
      });
    }

    batch.notes.push(clean(note));
  }

  for (const note of latest.notes) {
    if (manifestIds.has(note.id) || note.pending === "create") continue;
    if (note.pending === "update") {
      batch.notes.push({ ...note, pending: "create", updated: "" });
    } else {
      batch.deleteNotes.push(note.id);
    }
  }

  const serverFolderIds = new Set(serverFolders.map((row) => row.id));
  const foldersById = new Map(latest.folders.map((row) => [row.id, row]));
  for (const row of serverFolders) {
    if (tombstoned.has(row.id)) continue;
    const held = foldersById.get(row.id);
    if (!held || (held.pending === null && held.path !== row.path)) {
      batch.folders.push({ id: row.id, path: row.path, pending: null });
    }
  }
  for (const folder of latest.folders) {
    if (folder.pending === null && !serverFolderIds.has(folder.id)) {
      batch.deleteFolders.push(folder.id);
    }
  }

  for (const tombstone of latest.tombstones) {
    const gone =
      tombstone.table === "notes"
        ? !manifestIds.has(tombstone.id)
        : !serverFolderIds.has(tombstone.id);
    if (gone) batch.deleteTombstones.push(tombstone.id);
  }

  await applyWrite(batch);
}
