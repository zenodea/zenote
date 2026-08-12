import type { Note } from "./notes";

const TAG_SOURCE = String.raw`(?<=^|[\s([{])#([A-Za-z0-9_-]*[A-Za-z][A-Za-z0-9_-]*)`;

export function tagRegex(): RegExp {
  return new RegExp(TAG_SOURCE, "g");
}

export function normaliseTag(tag: string): string {
  return tag.trim().replace(/^#/, "").toLowerCase();
}

function extractInlineTags(body: string): string[] {
  const prose = body.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
  return [...prose.matchAll(tagRegex())].map((match) => match[1]);
}

/** Frontmatter tags and inline #tags, merged and deduplicated. */
export function noteTags(note: Note): string[] {
  const tags = [...note.tags, ...extractInlineTags(note.body)].map(normaliseTag);
  return [...new Set(tags)].sort();
}

export function buildTagIndex(notes: Note[]): Map<string, Note[]> {
  const index = new Map<string, Note[]>();

  for (const note of notes) {
    for (const tag of noteTags(note)) {
      const existing = index.get(tag) ?? [];
      existing.push(note);
      index.set(tag, existing);
    }
  }

  return index;
}
