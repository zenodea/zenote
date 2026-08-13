import type { Note } from "./notes";
import { resolvedTargets, type WikilinkResolver } from "./wikilinks";

export type Backlink = { slug: string; title: string };

export function buildBacklinks(
  notes: Note[],
  resolver: WikilinkResolver,
): Map<string, Backlink[]> {
  const backlinks = new Map<string, Backlink[]>();

  for (const source of notes) {
    for (const target of resolvedTargets(source, resolver)) {
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
