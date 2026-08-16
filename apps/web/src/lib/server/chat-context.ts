import "server-only";
import type { ChatSubject } from "../chat";
import { parseQuery, prepareDocs, searchDocs } from "../search";
import { resolvedTargets } from "../wikilinks";
import { getNote } from "./notes";
import { getBacklinks, getResolver, getSearchDocs } from "./vault-data";

export type ContextNote = {
  slug: string;
  title: string;
  body: string;
  relation: string;
};

/** Characters of vault text sent with a question, and how much of any one note. */
const BUDGET = 24_000;
const SUBJECT_LIMIT = 10_000;
const EXCERPT = 1_500;
const RETRIEVED = 4;

function clip(body: string, limit: number): string {
  return body.length <= limit ? body : `${body.slice(0, limit)}\n…[truncated]`;
}

/**
 * What the user is looking at, the notes it is linked to, and whatever else the
 * question points at — the assistant answers from a neighbourhood, not a page.
 */
export async function gatherContext(
  subject: ChatSubject,
  question: string,
): Promise<{ title: string; notes: ContextNote[] }> {
  const [resolver, backlinks] = await Promise.all([
    getResolver(),
    getBacklinks(),
  ]);

  const seen = new Set<string>();
  const notes: ContextNote[] = [];
  let spent = 0;

  const add = async (slug: string, relation: string, limit = EXCERPT) => {
    if (seen.has(slug) || spent >= BUDGET) return;
    seen.add(slug);

    const note = await getNote(slug);
    if (!note) return;

    const body = clip(note.body, limit);
    spent += body.length;
    notes.push({ slug, title: note.title, body, relation });
  };

  const subjects =
    subject.kind === "note" ? [subject.slug] : subject.slugs.slice(0, 12);
  const relation =
    subject.kind === "note" ? "the note being read" : "selected on the graph";

  for (const slug of subjects) {
    await add(
      slug,
      relation,
      subject.kind === "note" ? SUBJECT_LIMIT : EXCERPT,
    );
  }

  // One hop out, in both directions: what the subject links to and what links back.
  for (const slug of subjects) {
    const note = await getNote(slug);
    if (!note) continue;

    for (const target of resolvedTargets(note, resolver)) {
      await add(target, "linked from what the user is looking at");
    }
    for (const backlink of backlinks.get(slug) ?? []) {
      await add(backlink.slug, "links to what the user is looking at");
    }
  }

  // Whatever the question itself points at, wherever it lives in the vault.
  const query = parseQuery(question);
  if (query.terms.length > 0 || query.tags.length > 0) {
    const hits = searchDocs(prepareDocs(await getSearchDocs()), query, true)
      .filter((hit) => !seen.has(hit.slug))
      .slice(0, RETRIEVED);

    for (const hit of hits) await add(hit.slug, "matches the question");
  }

  const title =
    subject.kind === "note"
      ? (notes[0]?.title ?? subject.slug)
      : `${subjects.length} notes selected on the graph`;

  return { title, notes };
}
