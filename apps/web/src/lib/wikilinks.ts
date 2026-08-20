import { stripCode } from "./markdown";
import { filename } from "./slug";
import type { Note } from "./note";

export type WikilinkResolver = Map<string, string>;

export const WIKILINK_TARGET = String.raw`[^\[\]|#]`;

const WIKILINK_SOURCE = String.raw`\[\[(${WIKILINK_TARGET}+)(?:#([^\[\]|]+))?(?:\|([^\[\]]+))?\]\]`;

export function wikilinkRegex(): RegExp {
  return new RegExp(WIKILINK_SOURCE, "g");
}

const IMAGE_EXTENSION = /\.(png|jpe?g|gif|webp|svg|avif)$/i;

export function isImageName(name: string): boolean {
  return IMAGE_EXTENSION.test(name.trim());
}

export type WikilinkOccurrence = {
  target: string;
  text: string;
  before: string;
  after: string;
};

const CONTEXT_WINDOW = 80;

function renderInline(markdown: string): string {
  return markdown.replace(wikilinkRegex(), (_, target, _heading, alias) =>
    ((alias as string | undefined) ?? (target as string)).trim(),
  );
}

export function extractOccurrences(body: string): WikilinkOccurrence[] {
  const occurrences: WikilinkOccurrence[] = [];

  for (const line of stripCode(body).split("\n")) {
    const prose = line.replace(/^[>\s]*(?:[-*+] |\d+\. |#{1,6} )?/, "");

    for (const match of prose.matchAll(wikilinkRegex())) {
      const [full, target, , alias] = match;
      if (isImageName(target)) continue;
      let before = renderInline(prose.slice(0, match.index));
      let after = renderInline(prose.slice(match.index + full.length));
      if (before.length > CONTEXT_WINDOW) {
        before = `…${before.slice(-CONTEXT_WINDOW)}`;
      }
      if (after.length > CONTEXT_WINDOW) {
        after = `${after.slice(0, CONTEXT_WINDOW)}…`;
      }

      occurrences.push({
        target,
        text: (alias ?? target).trim(),
        before,
        after,
      });
    }
  }
  return occurrences;
}

export function extractTargets(body: string): string[] {
  return extractOccurrences(body).map((occurrence) => occurrence.target);
}

export function replaceWikilinkTargets(
  body: string,
  rename: (target: string) => string | null,
): string {
  return body
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((segment, index) =>
      index % 2 === 1
        ? segment
        : segment.replace(wikilinkRegex(), (full, target, heading, alias) => {
            const next = rename(target as string);
            if (next === null) return full;
            const rest = `${heading ? `#${heading}` : ""}${alias ? `|${alias}` : ""}`;
            return `[[${next}${rest}]]`;
          }),
    )
    .join("");
}

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

export function buildResolver(notes: Note[]): WikilinkResolver {
  const resolver: WikilinkResolver = new Map();

  for (const note of notes) {
    resolver.set(normalise(filename(note.slug)), note.slug);
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
