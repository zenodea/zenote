"use client";

import { createClient } from "../supabase/client";
import {
  deleteLegacyDb,
  deleteVaultDb,
  deleteVaultEntry,
  readAppMeta,
  readVaultEntries,
  saveVaultEntry,
  type VaultEntry,
} from "./registry";
import { vaultStore } from "./store";
import { startSync } from "./sync";
import { openVault } from "./vaults";

export async function bootVault(): Promise<void> {
  const supabase = createClient();

  let ownerId: string | null = null;
  let email: string | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    ownerId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
    email = typeof data?.claims?.email === "string" ? data.claims.email : null;
  } catch {}

  await deleteLegacyDb();
  let entries = await readVaultEntries();

  if (ownerId) {
    const foreign = entries.filter(
      (entry) => entry.ownerId && entry.ownerId !== ownerId,
    );
    for (const entry of foreign) {
      await deleteVaultDb(entry.id);
      await deleteVaultEntry(entry.id);
    }
    entries = entries.filter((entry) => !foreign.includes(entry));

    for (const entry of entries.filter((entry) => entry.ownerId === null)) {
      entry.ownerId = ownerId;
      await saveVaultEntry(entry);
    }
  }

  if (ownerId && entries.length === 0 && navigator.onLine) {
    try {
      const { data } = await supabase
        .from("vaults")
        .select("id,name")
        .order("created_at")
        .returns<{ id: string; name: string }[]>();
      for (const row of data ?? []) {
        const entry: VaultEntry = {
          id: row.id,
          name: row.name,
          ownerId,
          synced: true,
        };
        entries.push(entry);
        await saveVaultEntry(entry);
      }
    } catch {}

    if (entries.length === 0) {
      const entry: VaultEntry = {
        id: crypto.randomUUID(),
        name: "Initial Vault",
        ownerId,
        synced: true,
      };
      entries.push(entry);
      await saveVaultEntry(entry);
    }
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));
  vaultStore.patch({ vaults: entries, ownerId, email });

  if (entries.length === 0) {
    vaultStore.patch({ status: "setup" });
    return;
  }

  const activeId = await readAppMeta("activeVaultId");
  const active = entries.find((entry) => entry.id === activeId) ?? entries[0];
  await openVault(active);
  startSync();
}
