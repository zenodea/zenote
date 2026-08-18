import "server-only";
import { cache } from "react";
import type { Note } from "../note";
import { createClient } from "./supabase";

export type { Note };

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

export async function loadAllNotes(vaultId: string): Promise<Note[]> {
  const supabase = await createClient();
  const rows: NoteRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("notes")
      .select(COLUMNS)
      .eq("vault_id", vaultId)
      .order("slug")
      .range(from, from + PAGE_SIZE - 1)
      .returns<NoteRow[]>();

    if (error) throw new Error(`Could not load notes: ${error.message}`);

    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  return rows.map(toNote).sort((a, b) => a.slug.localeCompare(b.slug));
}

const CHUNK = 100;

export async function loadNotes(
  vaultId: string,
  slugs: string[],
): Promise<Note[]> {
  if (slugs.length === 0) return [];

  const supabase = await createClient();
  const rows: NoteRow[] = [];

  for (let from = 0; from < slugs.length; from += CHUNK) {
    const { data, error } = await supabase
      .from("notes")
      .select(COLUMNS)
      .eq("vault_id", vaultId)
      .in("slug", slugs.slice(from, from + CHUNK))
      .returns<NoteRow[]>();

    if (error) throw new Error(`Could not load notes: ${error.message}`);
    rows.push(...data);
  }

  return rows.map(toNote);
}

export const getNote = cache(
  async (vaultId: string, slug: string): Promise<Note | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notes")
    .select(COLUMNS)
    .eq("vault_id", vaultId)
    .eq("slug", slug)
    .maybeSingle<NoteRow>();

  if (error) {
    throw new Error(`Could not load note "${slug}": ${error.message}`);
  }

  return data ? toNote(data) : null;
  },
);
