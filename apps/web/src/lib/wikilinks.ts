import type { Note } from "./notes";

export type WikilinkResolver = Map<string, string>;

const WIKILINK_SOURCE = String.raw`\[\[([^\[\]|#]+)(?:#([^\[\]|]+))?(?:\|([^\[\]]+))?\]\]`;

export function wikilinkRegex(): RegExp {
  return new RegExp(WIKILINK_SOURCE, "g");
}

export type WikilinkOccurrence = {
  /** The raw link target, unresolved. */
  target: string;
  /** The link's display text (alias if given, else the target). */
  text: string;
  /** The surrounding line, split around the link, other wikilinks rendered
   * to their display text and markdown list/heading prefixes stripped. */
  before: string;
  after: string;
};

const CONTEXT_WINDOW = 80;

function stripCode(body: string): string {
  return body.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
}

function renderInline(markdown: string): string {
  return markdown.replace(wikilinkRegex(), (_, target, _heading, alias) =>
    ((alias as string | undefined) ?? (target as string)).trim(),
  );
}

/** Every wikilink in the body, each with the line of prose around it. */
export function extractOccurrences(body: string): WikilinkOccurrence[] {
  const occurrences: WikilinkOccurrence[] = [];

  for (const line of stripCode(body).split("\n")) {
    const prose = line.replace(/^[>\s]*(?:[-*+] |\d+\. |#{1,6} )?/, "");

    for (const match of prose.matchAll(wikilinkRegex())) {
      const [full, target, , alias] = match;
      let before = renderInline(prose.slice(0, match.index));
      let after = renderInline(prose.slice(match.index + full.length));
      if (before.length > CONTEXT_WINDOW) {
        before = `…${before.slice(-CONTEXT_WINDOW)}`;
      }
      if (after.length > CONTEXT_WINDOW) {
        after = `${after.slice(0, CONTEXT_WINDOW)}…`;
      }

      occurrences.push({ target, text: (alias ?? target).trim(), before, after });
    }
  }
  return occurrences;
}

export function extractTargets(body: string): string[] {
  return extractOccurrences(body).map((occurrence) => occurrence.target);
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

/** A note's wikilink targets as resolved slugs: deduped, self-links dropped. */
export function resolvedTargets(
  note: Note,
  resolver: WikilinkResolver,
): Set<string> {
  const targets = new Set<string>();
  for (const target of extractTargets(note.body)) {
    const slug = resolveWikilink(resolver, target);
    if (slug !== null && slug !== note.slug) targets.add(slug);
  }
  return targets;
}
