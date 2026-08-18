"use client";

import type { LocalFolder, LocalNote, Tombstone } from "./types";

const NOTES = "notes";
const FOLDERS = "folders";
const TOMBSTONES = "tombstones";

let activeVaultId: string | null = null;

export function setActiveVaultDb(id: string): void {
  activeVaultId = id;
}

function openDb(): Promise<IDBDatabase> {
  if (!activeVaultId) return Promise.reject(new Error("No vault is open."));

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(`zenote-vault-${activeVaultId}`, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore(NOTES, { keyPath: "id" });
      db.createObjectStore(FOLDERS, { keyPath: "id" });
      db.createObjectStore(TOMBSTONES, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function inDb<T>(fn: (db: IDBDatabase) => Promise<T>): Promise<T> {
  const db = await openDb();
  try {
    return await fn(db);
  } finally {
    db.close();
  }
}

function getAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(store).objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

export type VaultData = {
  notes: LocalNote[];
  folders: LocalFolder[];
  tombstones: Tombstone[];
};

export function readVault(): Promise<VaultData> {
  return inDb(async (db) => {
    const [notes, folders, tombstones] = await Promise.all([
      getAll<LocalNote>(db, NOTES),
      getAll<LocalFolder>(db, FOLDERS),
      getAll<Tombstone>(db, TOMBSTONES),
    ]);
    return { notes, folders, tombstones };
  });
}

export type VaultWrite = {
  notes?: LocalNote[];
  deleteNotes?: string[];
  folders?: LocalFolder[];
  deleteFolders?: string[];
  tombstones?: Tombstone[];
  deleteTombstones?: string[];
};

export function writeVault(batch: VaultWrite): Promise<void> {
  return inDb(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction([NOTES, FOLDERS, TOMBSTONES], "readwrite");

        const apply = <T>(store: string, put?: T[], drop?: string[]) => {
          if (!put?.length && !drop?.length) return;
          const target = tx.objectStore(store);
          for (const row of put ?? []) target.put(row);
          for (const id of drop ?? []) target.delete(id);
        };

        apply(NOTES, batch.notes, batch.deleteNotes);
        apply(FOLDERS, batch.folders, batch.deleteFolders);
        apply(TOMBSTONES, batch.tombstones, batch.deleteTombstones);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}
