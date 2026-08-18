import type { Note } from "../note";
import { filename } from "../slug";
import {
  buildResolver,
  replaceWikilinkTargets,
  resolveWikilink,
  type WikilinkResolver,
} from "../wikilinks";

export type SlugRename = { from: string; to: string };

export function planLinkRewrites(
  notes: Note[],
  renames: SlugRename[],
): { id: string; body: string }[] {
  const moved = renames.filter((rename) => rename.from !== rename.to);
  if (moved.length === 0) return [];

  const resolver = buildResolver(notes);

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

  const rewrites: { id: string; body: string }[] = [];
  for (const note of notes) {
    const next = replaceWikilinkTargets(note.body, rename);
    if (next !== note.body) rewrites.push({ id: note.id, body: next });
  }
  return rewrites;
}
