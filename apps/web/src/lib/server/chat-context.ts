import "server-only";
import type { ChatSubject } from "../chat";
import { resolvedTargets } from "../wikilinks";
import { getNote } from "./notes";
import { getBacklinks, getNoteTitles, getResolver } from "./vault-data";

export type ContextNote = {
  slug: string;
  title: string;
  body: string;
  relation: string;
};

export type NeighbourNote = {
  slug: string;
  title: string;
  relation: string;
};

/** Characters of a subject's own text sent up front; the tools fetch the rest. */
const SUBJECT_LIMIT = 10_000;
const SELECTION_LIMIT = 1_500;
const SELECTION_CAP = 12;

export function clip(body: string, limit: number): string {
  return body.length <= limit ? body : `${body.slice(0, limit)}\n…[truncated]`;
}

/**
 * What the user is looking at, plus the names of everything one link away —
 * enough to answer from, and handles for the tools to pull on.
 */
export async function gatherContext(subject: ChatSubject): Promise<{
  title: string;
  notes: ContextNote[];
  neighbours: NeighbourNote[];
}> {
  const [resolver, backlinks, titles] = await Promise.all([
    getResolver(),
    getBacklinks(),
    getNoteTitles(),
  ]);

  const subjects =
    subject.kind === "note" ? [subject.slug] : subject.slugs.slice(0, SELECTION_CAP);
  const relation =
    subject.kind === "note" ? "the note being read" : "selected on the graph";
  const limit = subject.kind === "note" ? SUBJECT_LIMIT : SELECTION_LIMIT;

  const notes: ContextNote[] = [];
  const seen = new Set<string>();
  const neighbours: NeighbourNote[] = [];

  for (const slug of subjects) {
    const note = await getNote(slug);
    if (!note || seen.has(slug)) continue;
    seen.add(slug);
    notes.push({ slug, title: note.title, body: clip(note.body, limit), relation });
  }

  const addNeighbour = (slug: string, how: string) => {
    if (seen.has(slug)) return;
    seen.add(slug);
    neighbours.push({ slug, title: titles[slug] ?? slug, relation: how });
  };

  for (const { slug } of [...notes]) {
    const note = await getNote(slug);
    if (!note) continue;
    for (const target of resolvedTargets(note, resolver)) {
      addNeighbour(target, "linked from it");
    }
    for (const backlink of backlinks.get(slug) ?? []) {
      addNeighbour(backlink.slug, "links to it");
    }
  }

  const title =
    subject.kind === "note"
      ? (notes[0]?.title ?? subject.slug)
      : `${subjects.length} notes selected on the graph`;

  return { title, notes, neighbours };
}
