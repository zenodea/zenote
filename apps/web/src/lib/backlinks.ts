import type { Note } from "./notes";
import {
  extractOccurrences,
  resolveWikilink,
  type WikilinkResolver,
} from "./wikilinks";

export type BacklinkContext = { before: string; text: string; after: string };
export type Backlink = {
  slug: string;
  title: string;
  contexts: BacklinkContext[];
};

export function buildBacklinks(
  notes: Note[],
  resolver: WikilinkResolver,
): Map<string, Backlink[]> {
  const backlinks = new Map<string, Backlink[]>();

  for (const source of notes) {
    // One entry per target, so a note linking twice shares one Backlink.
    const entries = new Map<string, Backlink>();

    for (const occurrence of extractOccurrences(source.body)) {
      const target = resolveWikilink(resolver, occurrence.target);
      if (target === null || target === source.slug) continue;

      let entry = entries.get(target);
      if (!entry) {
        entry = { slug: source.slug, title: source.title, contexts: [] };
        entries.set(target, entry);

        const list = backlinks.get(target) ?? [];
        list.push(entry);
        backlinks.set(target, list);
      }

      const { before, text, after } = occurrence;
      const duplicate = entry.contexts.some(
        (c) => c.before === before && c.text === text && c.after === after,
      );
      if (!duplicate) entry.contexts.push({ before, text, after });
    }
  }

  for (const list of backlinks.values()) {
    list.sort((a, b) => a.title.localeCompare(b.title));
  }

  return backlinks;
}
