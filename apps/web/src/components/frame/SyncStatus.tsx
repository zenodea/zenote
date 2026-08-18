"use client";

import { useSyncState } from "@/lib/stores/sync-status";
import { useVault } from "@/lib/vault/store";

export function SyncStatus({ className = "" }: { className?: string }) {
  const state = useSyncState();
  const { ownerId, notes, folders, tombstones } = useVault();

  const pending =
    notes.filter((note) => note.pending !== null).length +
    folders.filter((folder) => folder.pending !== null).length +
    tombstones.length;

  if (state === "synced" && pending === 0) return null;

  const label =
    state === "local"
      ? ownerId
        ? "Not synced"
        : "Local vault"
      : state === "offline"
        ? pending > 0
          ? `Offline · ${pending} unsynced`
          : "Offline"
        : state === "error"
          ? "Sync error"
          : state === "syncing"
            ? "Syncing…"
            : `${pending} unsynced`;

  return (
    <span
      role="status"
      className={`truncate text-xs opacity-60 ${className}`}
    >
      {label}
    </span>
  );
}
