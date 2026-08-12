import type { Note } from "./notes";
import { extractTargets, resolveWikilink, type WikilinkResolver } from "./wikilinks";

export type Backlink = { slug: string; title: string };

export function buildBacklinks(
  notes: Note[],
  resolver: WikilinkResolver,
): Map<string, Backlink[]> {
  const backlinks = new Map<string, Backlink[]>();

  for (const source of notes) {
    const targets = new Set(
      extractTargets(source.body)
        .map((target) => resolveWikilink(resolver, target))
        .filter((slug): slug is string => slug !== null && slug !== source.slug),
    );

    for (const target of targets) {
      const existing = backlinks.get(target) ?? [];
      existing.push({ slug: source.slug, title: source.title });
      backlinks.set(target, existing);
    }
  }

  for (const list of backlinks.values()) {
    list.sort((a, b) => a.title.localeCompare(b.title));
  }

  return backlinks;
}
