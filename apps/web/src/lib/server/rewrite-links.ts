import "server-only";
import { filename } from "../slug";
import {
  buildResolver,
  replaceWikilinkTargets,
  resolveWikilink,
  type WikilinkResolver,
} from "../wikilinks";
import { getAllNotes } from "./notes";
import { createClient } from "./supabase";

export type SlugRename = { from: string; to: string };

/** Best-effort: a failure here leaves a broken link, never a broken action. */
export async function rewriteWikilinks(renames: SlugRename[]): Promise<void> {
  const moved = renames.filter((rename) => rename.from !== rename.to);
  if (moved.length === 0) return;

  const notes = await getAllNotes();
  const resolver = buildResolver(notes);

  // The names a link could have reached the note by before it moved.
  const oldNames: WikilinkResolver = new Map();
  for (const { from, to } of moved) {
    oldNames.set(from.toLowerCase(), to);
    if (filename(from) !== filename(to)) {
      oldNames.set(filename(from).toLowerCase(), to);
    }
  }

  const rename = (target: string): string | null => {
    const to = resolveWikilink(oldNames, target);
    if (!to) return null;
    if (resolveWikilink(resolver, target) === to) return null;
    const short = filename(to);
    return !target.includes("/") && resolveWikilink(resolver, short) === to
      ? short
      : to;
  };

  const supabase = await createClient();
  for (const note of notes) {
    const next = replaceWikilinkTargets(note.body, rename);
    if (next === note.body) continue;

    const { error } = await supabase
      .from("notes")
      .update({ body: next })
      .eq("slug", note.slug);
    if (error) {
      console.error(`Could not rewrite links in “${note.slug}”:`, error.message);
    }
  }
}
