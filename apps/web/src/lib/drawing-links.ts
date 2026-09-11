import {
  isImageName,
  resolveWikilink,
  wikilinkRegex,
  type WikilinkResolver,
} from "./wikilinks";

export const NOTE_LINK_PREFIX = "/notes/";

type Element = Record<string, unknown>;

function noteLink(text: string, resolver: WikilinkResolver): string | null {
  for (const match of text.matchAll(wikilinkRegex())) {
    if (isImageName(match[1])) continue;
    const slug = resolveWikilink(resolver, match[1]);
    if (slug !== null) return `${NOTE_LINK_PREFIX}${slug}`;
  }
  return null;
}

export function withNoteLinks(
  elements: readonly Element[],
  resolver: WikilinkResolver,
): readonly Element[] {
  let changed = false;

  const next = elements.map((element) => {
    if (element.type !== "text" || typeof element.text !== "string") {
      return element;
    }

    const current = typeof element.link === "string" ? element.link : null;
    if (current !== null && !current.startsWith(NOTE_LINK_PREFIX)) {
      return element;
    }

    const link = noteLink(element.text, resolver);
    if (link === current) return element;

    changed = true;
    return { ...element, link };
  });

  return changed ? next : elements;
}

export function noteHref(link: unknown): string | null {
  return typeof link === "string" && link.startsWith(NOTE_LINK_PREFIX)
    ? link
    : null;
}
