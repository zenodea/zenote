"use server";

import { revalidatePath } from "next/cache";
import {
  rewriteWikilinks,
  type SlugRename,
} from "@/lib/server/rewrite-links";
import { createClient } from "@/lib/server/supabase";
import { filename, folder as parentOf, joinSlug } from "@/lib/slug";

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
  await rewriteWikilinks([{ from: slug, to: next }]);
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
  await rewriteWikilinks([{ from: slug, to: next }]);
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

type Reprefixed = ActionResult & {
  renames?: SlugRename[];
  undo?: () => Promise<void>;
};

type Move = { id: string; from: string; to: string };

function plan(
  rows: { id: string; path: string }[],
  prefix: string,
  to: string | null,
): { moves: Move[]; taken: string | null } {
  const moves: Move[] = [];
  const staying = new Set<string>();

  for (const row of rows) {
    if (!row.path.startsWith(prefix)) {
      staying.add(row.path);
      continue;
    }
    const rest = row.path.slice(prefix.length);
    moves.push({
      id: row.id,
      from: row.path,
      to: to === null ? rest : joinSlug(to, rest),
    });
  }

  const clash = moves.find((move) => staying.has(move.to));
  return { moves, taken: clash ? clash.to : null };
}

/** A folder is a row here and a prefix on every slug beneath it; both move together. */
async function reprefix(from: string, to: string | null): Promise<Reprefixed> {
  const supabase = await createClient();
  const prefix = `${from}/`;

  const [notes, folders] = await Promise.all([
    supabase.from("notes").select("id,slug").returns<
      { id: string; slug: string }[]
    >(),
    supabase.from("folders").select("id,path").returns<
      { id: string; path: string }[]
    >(),
  ]);

  if (notes.error) return { error: notes.error.message };
  if (folders.error) return { error: folders.error.message };

  const paths = (notes.data ?? []).map(({ id, slug }) => ({ id, path: slug }));
  const moved = plan(paths, prefix, to);
  const nested = plan(folders.data ?? [], prefix, to);

  // Nothing is written until every destination is known to be free.
  const taken = moved.taken ?? nested.taken;
  if (taken) return { error: `“${taken}” already exists.` };

  const doneNotes: Move[] = [];
  const doneFolders: Move[] = [];

  async function undo() {
    for (const move of doneNotes) {
      await supabase.from("notes").update({ slug: move.from }).eq("id", move.id);
    }
    for (const move of doneFolders) {
      await supabase
        .from("folders")
        .update({ path: move.from })
        .eq("id", move.id);
    }
  }

  for (const move of moved.moves) {
    const { error } = await supabase
      .from("notes")
      .update({ slug: move.to })
      .eq("id", move.id);
    if (error) {
      await undo();
      return failed(error, `“${move.to}” already exists.`);
    }
    doneNotes.push(move);
  }

  for (const move of nested.moves) {
    const { error } = await supabase
      .from("folders")
      .update({ path: move.to })
      .eq("id", move.id);
    if (error) {
      await undo();
      return failed(error, `“${move.to}” already exists.`);
    }
    doneFolders.push(move);
  }

  return { renames: moved.moves.map(({ from, to }) => ({ from, to })), undo };
}

async function relocate(path: string, next: string): Promise<ActionResult> {
  if (next === path) return {};
  // Into itself or its own descendant would orphan everything below it.
  if (next.startsWith(`${path}/`)) {
    return { error: "A folder cannot be moved inside itself." };
  }

  const moved = await reprefix(path, next);
  if (moved.error) return moved;

  const supabase = await createClient();
  const { error } = await supabase
    .from("folders")
    .update({ path: next })
    .eq("path", path);

  // No row is fine: a folder holding notes is implied by their slugs.
  if (error) {
    await moved.undo?.();
    return failed(error, `“${next}” already exists.`);
  }
  await rewriteWikilinks(moved.renames ?? []);
  refresh();
  return {};
}

export async function moveFolder(
  path: string,
  into: string,
): Promise<ActionResult> {
  return relocate(path, joinSlug(into, filename(path)));
}

export async function renameFolder(
  path: string,
  name: string,
): Promise<ActionResult> {
  return relocate(path, joinSlug(parentOf(path), name));
}

/** The folder goes; everything it held moves up into its parent. */
export async function deleteFolder(path: string): Promise<ActionResult> {
  const parent = parentOf(path);

  const lifted = await reprefix(path, parent || null);
  if (lifted.error) return lifted;

  const supabase = await createClient();
  const { error } = await supabase.from("folders").delete().eq("path", path);
  if (error) {
    await lifted.undo?.();
    return { error: error.message };
  }

  await rewriteWikilinks(lifted.renames ?? []);
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
