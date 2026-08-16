import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { parseQuery, prepareDocs, searchDocs } from "../search";
import { resolveWikilink, resolvedTargets } from "../wikilinks";
import { clip } from "./chat-context";
import { getNote } from "./notes";
import {
  getBacklinks,
  getNoteTitles,
  getResolver,
  getSearchDocs,
} from "./vault-data";

const RESULTS = 8;
const BODY_LIMIT = 20_000;

export function vaultTools() {
  return {
    search_notes: tool({
      description:
        "Search every note in the vault. Terms match titles and content; #tag tokens filter by tag.",
      inputSchema: z.object({
        query: z
          .string()
          .describe("Space-separated search terms and #tag filters"),
      }),
      execute: async ({ query }) => {
        const hits = searchDocs(
          prepareDocs(await getSearchDocs()),
          parseQuery(query),
          true,
        ).slice(0, RESULTS);
        return {
          results: hits.map(({ slug, title, folder, snippet }) => ({
            slug,
            title,
            folder,
            snippet: snippet
              ? `${snippet.before}${snippet.match}${snippet.after}`
              : null,
          })),
        };
      },
    }),

    read_note: tool({
      description: "Fetch a note's full text.",
      inputSchema: z.object({
        note: z.string().describe("The note's title, filename, or slug"),
      }),
      execute: async ({ note: target }) => {
        const slug = resolveWikilink(await getResolver(), target);
        const note = slug ? await getNote(slug) : null;
        if (!note) {
          return { error: `No note called “${target}” — try search_notes.` };
        }
        return {
          slug: note.slug,
          title: note.title,
          tags: note.tags,
          body: clip(note.body, BODY_LIMIT),
        };
      },
    }),

    neighbours: tool({
      description: "List what a note links to and what links back to it.",
      inputSchema: z.object({
        note: z.string().describe("The note's title, filename, or slug"),
      }),
      execute: async ({ note: target }) => {
        const resolver = await getResolver();
        const slug = resolveWikilink(resolver, target);
        const note = slug ? await getNote(slug) : null;
        if (!note) return { error: `No note called “${target}”.` };

        const titles = await getNoteTitles();
        const backlinks = (await getBacklinks()).get(note.slug) ?? [];
        return {
          linksTo: [...resolvedTargets(note, resolver)].map((s) => ({
            slug: s,
            title: titles[s] ?? s,
          })),
          linkedFrom: backlinks.map((b) => ({ slug: b.slug, title: b.title })),
        };
      },
    }),

    // No execute: the reader's browser aims the graph and reports back.
    focus_graph: tool({
      description:
        "Point the app's graph at the named notes. Call it after an answer drawn from the notes, with the exact titles you cited.",
      inputSchema: z.object({
        notes: z
          .array(z.string())
          .min(1)
          .describe("Exact note titles or slugs"),
      }),
    }),
  };
}
