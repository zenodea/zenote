import "server-only";
import { cache } from "react";
import { createClient } from "./supabase";

export type Note = {
  slug: string;
  title: string;
  tags: string[];
  created: string;
  updated: string;
  body: string;
};

type NoteRow = {
  slug: string;
  title: string;
  tags: string[];
  body: string;
  created_at: string;
  updated_at: string;
};

const COLUMNS = "slug,title,tags,body,created_at,updated_at";

// PostgREST caps a response at max_rows, so a single select can silently truncate.
const PAGE_SIZE = 1000;

function toNote(row: NoteRow): Note {
  return {
    slug: row.slug,
    title: row.title || row.slug,
    tags: row.tags,
    created: row.created_at,
    updated: row.updated_at,
    body: row.body,
  };
}

export const getAllNotes = cache(async (): Promise<Note[]> => {
  const supabase = await createClient();
  const rows: NoteRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("notes")
      .select(COLUMNS)
      .order("slug")
      .range(from, from + PAGE_SIZE - 1)
      .returns<NoteRow[]>();

    if (error) throw new Error(`Could not load notes: ${error.message}`);

    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  return rows.map(toNote).sort((a, b) => a.slug.localeCompare(b.slug));
});

export const getNote = cache(async (slug: string): Promise<Note | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notes")
    .select(COLUMNS)
    .eq("slug", slug)
    .maybeSingle<NoteRow>();

  if (error) throw new Error(`Could not load note "${slug}": ${error.message}`);

  return data ? toNote(data) : null;
});
