import type { Note } from "./server/notes";

/** Drops a leading `# Title` heading that only repeats the note's own title. */
export function stripTitleHeading(note: Note): string {
  const match = note.body.match(/^#\s+(.+?)\s*(?:\r?\n+|$)/);
  if (match && match[1].toLowerCase() === note.title.trim().toLowerCase()) {
    return note.body.slice(match[0].length);
  }
  return note.body;
}
