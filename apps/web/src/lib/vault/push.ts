"use client";

import { filename } from "../slug";
import { createClient } from "../supabase/client";
import { applyWrite } from "./apply";
import {
  conflictSlug,
  rebaseKeepingLocal,
  resolveConflict,
  takenChecker,
} from "./conflicts";
import { dirtyEditingId } from "./editing";
import { DUPLICATE, fetchNotesById } from "./remote";
import type { VaultEntry } from "./registry";
import { getById, vaultStore } from "./store";
import type { LocalFolder, LocalNote, Tombstone } from "./types";

const ensured = new Set<string>();

async function ensureVaultRow(vault: VaultEntry): Promise<void> {
  if (ensured.has(vault.id)) return;
  const supabase = createClient();
  const { error } = await supabase
    .from("vaults")
    .upsert(
      { id: vault.id, name: vault.name },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
  ensured.add(vault.id);
}

async function pushDelete(tombstone: Tombstone): Promise<void> {
  const supabase = createClient();

  if (tombstone.table === "folders") {
    const { error } = await supabase
      .from("folders")
      .delete()
      .eq("id", tombstone.id);
    if (error) throw new Error(error.message);
  } else {
    let query = supabase.from("notes").delete().eq("id", tombstone.id);
    if (tombstone.baseUpdated) {
      query = query.eq("updated_at", tombstone.baseUpdated);
    }
    const { error } = await query;
    if (error) throw new Error(error.message);
  }

  await applyWrite({ deleteTombstones: [tombstone.id] });
}

async function pushFolder(
  vaultId: string,
  folder: LocalFolder,
): Promise<void> {
  const supabase = createClient();

  if (folder.pending === "create") {
    const { error } = await supabase
      .from("folders")
      .insert({ id: folder.id, vault_id: vaultId, path: folder.path });
    if (error && error.code !== DUPLICATE) throw new Error(error.message);
    if (error) {
      await applyWrite({ deleteFolders: [folder.id] });
      return;
    }
  } else {
    const { error } = await supabase
      .from("folders")
      .update({ path: folder.path })
      .eq("id", folder.id);
    if (error && error.code !== DUPLICATE) throw new Error(error.message);
  }

  await applyWrite({ folders: [{ ...folder, pending: null }] });
}

async function finishPush(
  id: string,
  sentRev: number,
  updated: string,
): Promise<void> {
  const current = getById().get(id);
  if (!current) {
    await applyWrite({
      tombstones: [{ id, table: "notes", baseUpdated: updated }],
    });
    return;
  }
  await applyWrite({
    notes: [
      current.localRev === sentRev
        ? { ...current, pending: null, updated }
        : { ...current, pending: "update", updated },
    ],
  });
}

async function stepAside(note: LocalNote): Promise<void> {
  const { taken } = takenChecker();
  const slug = conflictSlug(note.slug, taken);
  await applyWrite({
    notes: [
      { ...note, slug, title: filename(slug), localRev: note.localRev + 1 },
    ],
  });
}

async function pushCreate(vaultId: string, note: LocalNote): Promise<void> {
  const supabase = createClient();
  const sentRev = note.localRev;

  const { data, error } = await supabase
    .from("notes")
    .insert({
      id: note.id,
      vault_id: vaultId,
      slug: note.slug,
      title: note.title,
      tags: note.tags,
      body: note.body,
      ...(note.created ? { created_at: note.created } : {}),
    })
    .select("updated_at")
    .single<{ updated_at: string }>();

  if (error?.code === DUPLICATE) {
    await stepAside(note);
    return;
  }
  if (error || !data) throw new Error(error?.message ?? "Insert failed.");
  await finishPush(note.id, sentRev, data.updated_at);
}

async function pushUpdate(note: LocalNote): Promise<void> {
  const supabase = createClient();
  const sentRev = note.localRev;

  const { data, error } = await supabase
    .from("notes")
    .update({
      slug: note.slug,
      title: note.title,
      tags: note.tags,
      body: note.body,
    })
    .eq("id", note.id)
    .eq("updated_at", note.updated)
    .select("updated_at")
    .maybeSingle<{ updated_at: string }>();

  if (error?.code === DUPLICATE) {
    await stepAside(note);
    return;
  }
  if (error) throw new Error(error.message);

  if (data) {
    await finishPush(note.id, sentRev, data.updated_at);
    return;
  }

  const server = await fetchNotesById([note.id]);
  const current = getById().get(note.id);
  if (!current) return;

  if (server.length === 0) {
    await applyWrite({
      notes: [{ ...current, pending: "create", updated: "" }],
    });
    return;
  }

  const { taken, claim } = takenChecker();
  const rows =
    current.id === dirtyEditingId()
      ? rebaseKeepingLocal(current, server[0], taken)
      : resolveConflict(current, server[0], taken);
  for (const row of rows) claim(row.slug);
  await applyWrite({ notes: rows });
}

export async function push(): Promise<void> {
  const state = vaultStore.get();
  const vault = state.vault;
  if (!vault) return;

  await ensureVaultRow(vault);

  for (const tombstone of state.tombstones) {
    await pushDelete(tombstone);
  }

  for (const folder of state.folders) {
    if (folder.pending !== null) await pushFolder(vault.id, folder);
  }

  for (const note of state.notes) {
    if (note.pending === "create") await pushCreate(vault.id, note);
    else if (note.pending === "update") await pushUpdate(note);
  }
}
