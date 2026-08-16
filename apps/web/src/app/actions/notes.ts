"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/server/supabase";
import { filename, joinSlug } from "@/lib/slug";

export type ActionResult = { error?: string };

export type SaveResult =
  { status: "saved"; updated: string } | { status: "conflict" };

const DUPLICATE = "23505";

function failed(error: { code: string; message: string }, duplicate: string) {
  return { error: error.code === DUPLICATE ? duplicate : error.message };
}

function refresh() {
  revalidatePath("/", "layout");
}

/** A body's wikilinks and tags reshape the graph and tag pages; called on leaving, not on every save. */
export async function revalidateVault() {
  refresh();
}

export async function createNote(slug: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("notes")
    .insert({ slug, title: filename(slug) });

  if (error) return failed(error, `“${slug}” already exists.`);
  refresh();
  return {};
}

export async function renameNote(
  slug: string,
  next: string,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("notes")
    .update({ slug: next, title: filename(next) })
    .eq("slug", slug);

  if (error) return failed(error, `“${next}” already exists.`);
  refresh();
  return {};
}

export async function moveNote(
  slug: string,
  folder: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const next = joinSlug(folder, filename(slug));

  const { error } = await supabase
    .from("notes")
    .update({ slug: next })
    .eq("slug", slug);

  if (error) return failed(error, `“${next}” already exists.`);
  refresh();
  return {};
}

export async function deleteNote(slug: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.from("notes").delete().eq("slug", slug);

  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function createFolder(path: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.from("folders").insert({ path });

  if (error) return failed(error, `“${path}” already exists.`);
  refresh();
  return {};
}

// Compare-and-set on updated_at: a second tab that saved first wins, and this one is told.
export async function saveNote(
  slug: string,
  body: string,
  base: string,
): Promise<SaveResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notes")
    .update({ body })
    .eq("slug", slug)
    .eq("updated_at", base)
    .select("updated_at")
    .maybeSingle<{ updated_at: string }>();

  if (error) throw new Error(`Could not save “${slug}”: ${error.message}`);
  if (!data) return { status: "conflict" };

  return { status: "saved", updated: data.updated_at };
}
