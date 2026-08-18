"use client";

import type { Note } from "../note";
import { createClient } from "../supabase/client";

type NoteRow = {
  id: string;
  slug: string;
  title: string;
  tags: string[];
  body: string;
  created_at: string;
  updated_at: string;
};

const COLUMNS = "id,slug,title,tags,body,created_at,updated_at";
const PAGE_SIZE = 1000;
const CHUNK = 100;

export const DUPLICATE = "23505";

export type ManifestRow = { id: string; slug: string; updated_at: string };
export type FolderRow = { id: string; path: string };

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title || row.slug,
    tags: row.tags,
    created: row.created_at,
    updated: row.updated_at,
    body: row.body,
  };
}

export async function readServerManifest(
  vaultId: string,
): Promise<ManifestRow[]> {
  const supabase = createClient();
  const rows: ManifestRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("notes")
      .select("id,slug,updated_at")
      .eq("vault_id", vaultId)
      .order("slug")
      .range(from, from + PAGE_SIZE - 1)
      .returns<ManifestRow[]>();

    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  return rows;
}

export async function readServerFolders(
  vaultId: string,
): Promise<FolderRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("folders")
    .select("id,path")
    .eq("vault_id", vaultId)
    .returns<FolderRow[]>();

  if (error) throw new Error(error.message);
  return data;
}

export async function fetchNotesById(ids: string[]): Promise<Note[]> {
  if (ids.length === 0) return [];
  const supabase = createClient();
  const rows: NoteRow[] = [];

  for (let from = 0; from < ids.length; from += CHUNK) {
    const { data, error } = await supabase
      .from("notes")
      .select(COLUMNS)
      .in("id", ids.slice(from, from + CHUNK))
      .returns<NoteRow[]>();

    if (error) throw new Error(error.message);
    rows.push(...data);
  }

  return rows.map(toNote);
}
