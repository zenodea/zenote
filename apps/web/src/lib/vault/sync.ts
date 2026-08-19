"use client";

import { setSyncState } from "../stores/sync-status";
import { pull } from "./pull";
import { push } from "./push";
import { saveVaultEntry } from "./registry";
import { vaultStore } from "./store";

const PUSH_DEBOUNCE_MS = 800;
const PULL_INTERVAL_MS = 60_000;

let inFlight: Promise<void> | null = null;

function pendingCount(): number {
  const state = vaultStore.get();
  return (
    state.notes.filter((note) => note.pending !== null).length +
    state.folders.filter((folder) => folder.pending !== null).length +
    state.tombstones.length
  );
}

async function round(): Promise<void> {
  await push();
  await pull();
  if (pendingCount() > 0) {
    await push();
    await pull();
  }
}

async function run(): Promise<void> {
  const state = vaultStore.get();
  if (state.status !== "ready" || !state.vault) return;
  if (!state.ownerId || !state.vault.synced) {
    setSyncState("local");
    return;
  }
  if (!navigator.onLine) {
    setSyncState("offline");
    return;
  }

  setSyncState("syncing");
  try {
    if (navigator.locks) {
      await navigator.locks.request("zenote-sync", round);
    } else {
      await round();
    }
    setSyncState("synced");
    await recordSync();
  } catch {
    setSyncState(navigator.onLine ? "error" : "offline");
  }
}

async function recordSync(): Promise<void> {
  const state = vaultStore.get();
  const vault = state.vault;
  if (!vault) return;

  const entry = { ...vault, lastSyncedAt: new Date().toISOString() };
  await saveVaultEntry(entry);
  vaultStore.set({
    ...vaultStore.get(),
    vault: entry,
    vaults: vaultStore
      .get()
      .vaults.map((row) => (row.id === entry.id ? entry : row)),
  });
}

export function syncNow(): Promise<void> {
  inFlight ??= run().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export const pullOnce = syncNow;

let pushTimer: ReturnType<typeof setTimeout> | null = null;

export function requestPush(): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void syncNow();
  }, PUSH_DEBOUNCE_MS);
}

let started = false;

export function startSync(): void {
  if (started || typeof window === "undefined") return;
  started = true;

  window.addEventListener("online", () => void syncNow());
  window.addEventListener("offline", () => setSyncState("offline"));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void syncNow();
  });
  setInterval(() => {
    if (!document.hidden) void syncNow();
  }, PULL_INTERVAL_MS);

  void syncNow();
}
