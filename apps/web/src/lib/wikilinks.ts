import type { Note } from "./notes";

export type WikilinkResolver = Map<string, string>;

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Keys are registered least- to most-specific, so a later exact slug match
 * overwrites a title or filename that collided with it.
 */
export function buildResolver(notes: Note[]): WikilinkResolver {
  const resolver: WikilinkResolver = new Map();

  for (const note of notes) {
    const filename = note.slug.split("/").pop()!;
    resolver.set(normalise(filename), note.slug);
  }

  for (const note of notes) {
    resolver.set(normalise(note.title), note.slug);
  }

  for (const note of notes) {
    resolver.set(normalise(note.slug), note.slug);
  }

  return resolver;
}

export function resolveWikilink(
  resolver: WikilinkResolver,
  target: string,
): string | null {
  return resolver.get(normalise(target)) ?? null;
}
