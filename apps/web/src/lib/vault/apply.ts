"use client";

import { writeVault, type VaultWrite } from "./db";
import { sortNotes, vaultStore } from "./store";
import type { LocalFolder, LocalNote, Tombstone } from "./types";

function upsert<T extends { id: string }>(
  rows: T[],
  put: T[] = [],
  drop: string[] = [],
): T[] {
  if (put.length === 0 && drop.length === 0) return rows;
  const gone = new Set(drop);
  const fresh = new Map(put.map((row) => [row.id, row]));

  const next = rows
    .filter((row) => !gone.has(row.id) && !fresh.has(row.id))
    .concat(put);
  return next;
}

export async function applyWrite(batch: VaultWrite): Promise<void> {
  const state = vaultStore.get();

  const notes = sortNotes(
    upsert<LocalNote>(state.notes, batch.notes, batch.deleteNotes),
  );
  const folders = upsert<LocalFolder>(
    state.folders,
    batch.folders,
    batch.deleteFolders,
  ).sort((a, b) => a.path.localeCompare(b.path));
  const tombstones = upsert<Tombstone>(
    state.tombstones,
    batch.tombstones,
    batch.deleteTombstones,
  );

  vaultStore.set({ ...state, notes, folders, tombstones });
  await writeVault(batch);
}
