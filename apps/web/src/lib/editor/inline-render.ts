import { normaliseTag } from "@/lib/tags";
import {
  resolveWikilink,
  wikilinkRegex,
  type WikilinkResolver,
} from "@/lib/wikilinks";

const PATTERN = new RegExp(
  [
    String.raw`(?<code>\`[^\`\n]+\`)`,
    String.raw`(?<strong>\*\*[^*\n]+\*\*|__[^_\n]+__)`,
    String.raw`(?<em>\*[^*\n]+\*|_[^_\n]+_)`,
    String.raw`(?<del>~~[^~\n]+~~)`,
    String.raw`(?<wiki>\[\[[^\[\]]+\]\])`,
    String.raw`(?<link>\[[^\[\]]*\]\([^()\s]*\))`,
    String.raw`(?<tag>(?<=^|[\s([{])#[A-Za-z0-9_-]*[A-Za-z][A-Za-z0-9_-]*)`,
  ].join("|"),
  "g",
);

const LINK = /^\[([^[\]]*)\]\(([^()\s]*)\)$/;

export function wikilinkElement(
  source: string,
  resolver: WikilinkResolver,
): HTMLElement {
  const match = wikilinkRegex().exec(source);
  const target = match?.[1] ?? source;
  const label = (match?.[3] ?? target).trim();
  const slug = resolveWikilink(resolver, target);

  if (slug === null) {
    const broken = document.createElement("span");
    broken.className = "wikilink-broken";
    broken.title = `No note found for "${target.trim()}"`;
    broken.textContent = label;
    return broken;
  }

  const anchor = document.createElement("span");
  anchor.className = "cm-wikilink";
  anchor.dataset.href = `/notes/${slug}`;
  anchor.textContent = label;
  return anchor;
}

function tagElement(source: string): HTMLElement {
  const tag = normaliseTag(source);
  const anchor = document.createElement("span");
  anchor.className = "tag";
  anchor.dataset.href = `/tags/${tag}`;
  anchor.textContent = `#${tag}`;
  return anchor;
}

function wrap(name: string, text: string): HTMLElement {
  const element = document.createElement(name);
  element.textContent = text;
  return element;
}

export function renderInlineDom(
  text: string,
  resolver: WikilinkResolver,
): DocumentFragment {
  const fragment = document.createDocumentFragment();
  let cursor = 0;

  for (const match of text.matchAll(PATTERN)) {
    const at = match.index ?? 0;
    if (at > cursor) {
      fragment.append(document.createTextNode(text.slice(cursor, at)));
    }
    cursor = at + match[0].length;

    const groups = match.groups ?? {};
    if (groups.code !== undefined) {
      fragment.append(wrap("code", match[0].slice(1, -1)));
    } else if (groups.strong !== undefined) {
      fragment.append(wrap("strong", match[0].slice(2, -2)));
    } else if (groups.em !== undefined) {
      fragment.append(wrap("em", match[0].slice(1, -1)));
    } else if (groups.del !== undefined) {
      fragment.append(wrap("del", match[0].slice(2, -2)));
    } else if (groups.wiki !== undefined) {
      fragment.append(wikilinkElement(match[0], resolver));
    } else if (groups.tag !== undefined) {
      fragment.append(tagElement(match[0]));
    } else {
      const parts = LINK.exec(match[0]);
      const anchor = document.createElement("span");
      anchor.className = "cm-link";
      anchor.dataset.href = parts?.[2] ?? "";
      anchor.textContent = parts?.[1] ?? match[0];
      fragment.append(anchor);
    }
  }

  if (cursor < text.length) {
    fragment.append(document.createTextNode(text.slice(cursor)));
  }
  return fragment;
}
