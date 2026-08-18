"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import type { VaultEntry } from "@/lib/vault/registry";
import { useVault } from "@/lib/vault/store";
import {
  attachVault,
  createVault,
  listServerVaults,
  removeVaultFromDevice,
  renameVault,
  switchVault,
  syncVaultUp,
} from "@/lib/vault/vaults";

function RenameRow({ vault }: { vault: VaultEntry }) {
  const [name, setName] = useState(vault.name);

  return (
    <div className="flex items-center gap-3 py-4">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") void renameVault(name);
        }}
        aria-label="Vault name"
        className="min-w-0 flex-1"
      />
      <Button
        variant="solid"
        onClick={() => void renameVault(name)}
        disabled={!name.trim() || name.trim() === vault.name}
      >
        Rename
      </Button>
    </div>
  );
}

export function VaultSettings() {
  const { vault, vaults, ownerId } = useVault();
  const [creating, setCreating] = useState("");
  const [remote, setRemote] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!ownerId) return;
    let alive = true;
    listServerVaults()
      .then((rows) => alive && setRemote(rows))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [ownerId]);

  const attachable = remote.filter(
    (row) => !vaults.some((entry) => entry.id === row.id),
  );

  return (
    <div className="divide-y divide-foreground/15">
      {vault && <RenameRow key={vault.id} vault={vault} />}

      {vault && !vault.synced && (
        <div className="flex items-center justify-between gap-6 py-4">
          <div>
            <p className="font-medium">This vault only exists on this device.</p>
            <Text variant="muted" className="mt-1 block">
              {ownerId
                ? "Sync it to your account to reach it anywhere."
                : "Sign in to sync it to your account."}
            </Text>
          </div>
          {ownerId && (
            <Button variant="accent" onClick={() => void syncVaultUp()}>
              Sync vault
            </Button>
          )}
        </div>
      )}

      <ul className="divide-y divide-foreground/10 py-2">
        {vaults.map((entry) => (
          <li key={entry.id} className="flex items-center gap-3 py-2">
            <button
              type="button"
              onClick={() => void switchVault(entry.id)}
              className={`min-w-0 flex-1 truncate rounded px-2 py-1.5 text-left hover:bg-foreground/10 ${
                entry.id === vault?.id ? "bg-foreground/10 text-accent" : ""
              }`}
            >
              {entry.name}
              {!entry.synced && (
                <span className="ml-2 text-xs opacity-50">local</span>
              )}
            </button>
            {entry.id !== vault?.id && vaults.length > 1 && (
              <Button
                variant="solid"
                onClick={() => {
                  if (
                    entry.synced ||
                    confirm(
                      `“${entry.name}” only exists on this device. Remove it for good?`,
                    )
                  ) {
                    void removeVaultFromDevice(entry.id);
                  }
                }}
              >
                Remove
              </Button>
            )}
          </li>
        ))}
      </ul>

      {attachable.length > 0 && (
        <div className="py-4">
          <Text variant="muted">On your account</Text>
          <ul className="mt-2 space-y-1">
            {attachable.map((row) => (
              <li key={row.id} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate">{row.name}</span>
                <Button variant="solid" onClick={() => void attachVault(row)}>
                  Open
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3 py-4">
        <Input
          value={creating}
          onChange={(event) => setCreating(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && creating.trim()) {
              void createVault(creating);
            }
          }}
          placeholder="New vault name…"
          aria-label="New vault name"
          className="min-w-0 flex-1"
        />
        <Button
          variant="solid"
          onClick={() => void createVault(creating)}
          disabled={!creating.trim()}
        >
          Create
        </Button>
      </div>
    </div>
  );
}
