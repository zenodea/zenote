import type { Note } from "./note";

export function stripTitleHeading(note: Note): string {
  const match = note.body.match(/^#\s+(.+?)\s*(?:\r?\n+|$)/);
  if (match && match[1].toLowerCase() === note.title.trim().toLowerCase()) {
    return note.body.slice(match[0].length);
  }
  return note.body;
}
