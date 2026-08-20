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

  const synced = state === "synced" && pending === 0;

  const label = synced
    ? "Synced"
    : state === "local"
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
      title={label}
      className={`flex shrink-0 items-center gap-1 ${className}`}
    >
      <span className="sr-only">{label}</span>
      {state === "error" && (
        <svg aria-hidden viewBox="0 0 2 8" className="h-2 w-1 fill-danger">
          <rect x="0.4" y="0" width="1.2" height="5" rx="0.6" />
          <circle cx="1" cy="7.1" r="0.85" />
        </svg>
      )}
      <span
        aria-hidden
        className={`h-2 w-2 rotate-45 border border-current ${
          synced ? "bg-current" : ""
        }`}
      />
    </span>
  );
}
