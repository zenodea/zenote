"use client";

import { navigate } from "../navigation";
import { createClient } from "../supabase/client";
import { readVault, setActiveVaultDb, writeVault } from "./db";
import {
  deleteVaultDb,
  deleteVaultEntry,
  saveVaultEntry,
  writeAppMeta,
  type VaultEntry,
} from "./registry";
import { sortNotes, vaultStore } from "./store";
import { syncNow } from "./sync";

function withEntry(vaults: VaultEntry[], entry: VaultEntry): VaultEntry[] {
  const rest = vaults.filter((vault) => vault.id !== entry.id);
  return [...rest, entry].sort((a, b) => a.name.localeCompare(b.name));
}

export async function openVault(entry: VaultEntry): Promise<void> {
  setActiveVaultDb(entry.id);
  await writeAppMeta("activeVaultId", entry.id);

  const { notes, folders, tombstones } = await readVault();
  const state = vaultStore.get();
  vaultStore.set({
    ...state,
    status: "ready",
    vault: entry,
    vaults: withEntry(state.vaults, entry),
    notes: sortNotes(notes),
    folders: folders.sort((a, b) => a.path.localeCompare(b.path)),
    tombstones,
  });

  void syncNow();
}

export async function switchVault(id: string): Promise<void> {
  const state = vaultStore.get();
  if (state.vault?.id === id) return;
  const entry = state.vaults.find((vault) => vault.id === id);
  if (!entry) return;

  await openVault(entry);
  navigate("/");
}

export async function createVault(name: string): Promise<void> {
  const state = vaultStore.get();
  const entry: VaultEntry = {
    id: crypto.randomUUID(),
    name: name.trim() || "My Vault",
    ownerId: state.ownerId,
    synced: state.ownerId !== null,
  };

  await saveVaultEntry(entry);
  await openVault(entry);
  navigate("/");
}

export async function renameVault(name: string): Promise<void> {
  const state = vaultStore.get();
  const vault = state.vault;
  const trimmed = name.trim();
  if (!vault || !trimmed || trimmed === vault.name) return;

  const entry = { ...vault, name: trimmed };
  await saveVaultEntry(entry);
  vaultStore.set({
    ...vaultStore.get(),
    vault: entry,
    vaults: withEntry(vaultStore.get().vaults, entry),
  });

  if (entry.synced && state.ownerId) {
    const supabase = createClient();
    const { error } = await supabase
      .from("vaults")
      .update({ name: trimmed })
      .eq("id", entry.id);
    if (error) console.error("Could not rename vault:", error.message);
  }
}

export async function listServerVaults(): Promise<
  { id: string; name: string }[]
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vaults")
    .select("id,name")
    .order("created_at")
    .returns<{ id: string; name: string }[]>();

  if (error) throw new Error(error.message);
  return data;
}

export async function attachVault(remote: {
  id: string;
  name: string;
}): Promise<void> {
  const state = vaultStore.get();
  if (!state.ownerId) return;

  const entry: VaultEntry = {
    id: remote.id,
    name: remote.name,
    ownerId: state.ownerId,
    synced: true,
  };
  await saveVaultEntry(entry);
  await openVault(entry);
  navigate("/");
}

export async function syncVaultUp(): Promise<void> {
  const state = vaultStore.get();
  const vault = state.vault;
  if (!vault || vault.synced || !state.ownerId) return;

  const notes = state.notes.map((note) => ({
    ...note,
    pending: "create" as const,
    updated: "",
    localRev: note.localRev + 1,
  }));
  const folders = state.folders.map((folder) => ({
    ...folder,
    pending: "create" as const,
  }));

  await writeVault({
    notes,
    folders,
    deleteTombstones: state.tombstones.map((tombstone) => tombstone.id),
  });

  const entry = { ...vault, synced: true, ownerId: state.ownerId };
  await saveVaultEntry(entry);
  vaultStore.set({
    ...vaultStore.get(),
    vault: entry,
    vaults: withEntry(vaultStore.get().vaults, entry),
    notes: sortNotes(notes),
    folders,
    tombstones: [],
  });

  void syncNow();
}

export async function removeVaultFromDevice(id: string): Promise<void> {
  const state = vaultStore.get();
  if (state.vault?.id === id || state.vaults.length < 2) return;

  await deleteVaultEntry(id);
  await deleteVaultDb(id);
  vaultStore.set({
    ...vaultStore.get(),
    vaults: vaultStore.get().vaults.filter((vault) => vault.id !== id),
  });
}
