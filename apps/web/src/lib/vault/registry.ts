"use client";

export type VaultEntry = {
  id: string;
  name: string;
  ownerId: string | null;
  synced: boolean;
  lastOpened?: string;
  lastSyncedAt?: string;
};

const DB = "zenote-app";
const VAULTS = "vaults";
const META = "meta";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(VAULTS, { keyPath: "id" });
      request.result.createObjectStore(META, { keyPath: "key" });
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

export function readVaultEntries(): Promise<VaultEntry[]> {
  return inDb(
    (db) =>
      new Promise((resolve, reject) => {
        const request = db.transaction(VAULTS).objectStore(VAULTS).getAll();
        request.onsuccess = () => resolve(request.result as VaultEntry[]);
        request.onerror = () => reject(request.error);
      }),
  );
}

export function saveVaultEntry(entry: VaultEntry): Promise<void> {
  return inDb(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(VAULTS, "readwrite");
        tx.objectStore(VAULTS).put(entry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

export function deleteVaultEntry(id: string): Promise<void> {
  return inDb(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(VAULTS, "readwrite");
        tx.objectStore(VAULTS).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

export function readAppMeta(key: string): Promise<string | null> {
  return inDb(
    (db) =>
      new Promise((resolve, reject) => {
        const request = db.transaction(META).objectStore(META).get(key);
        request.onsuccess = () =>
          resolve(
            (request.result as { value: string } | undefined)?.value ?? null,
          );
        request.onerror = () => reject(request.error);
      }),
  );
}

export function writeAppMeta(key: string, value: string): Promise<void> {
  return inDb(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(META, "readwrite");
        tx.objectStore(META).put({ key, value });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

export function deleteVaultDb(id: string): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(`zenote-vault-${id}`);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

export function deleteLegacyDb(): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase("zenote");
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}
