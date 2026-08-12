import type { Note } from "./notes";

export type WikilinkResolver = Map<string, string>;

const WIKILINK_SOURCE = String.raw`\[\[([^\[\]|#]+)(?:#([^\[\]|]+))?(?:\|([^\[\]]+))?\]\]`;

export function wikilinkRegex(): RegExp {
  return new RegExp(WIKILINK_SOURCE, "g");
}

export function extractTargets(body: string): string[] {
  const prose = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]*`/g, "");

  return [...prose.matchAll(wikilinkRegex())].map((match) => match[1]);
}

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

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
