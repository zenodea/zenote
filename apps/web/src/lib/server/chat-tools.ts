import "server-only";
import { revalidatePath } from "next/cache";
import { tool } from "ai";
import { z } from "zod";
import { createNote, moveNote } from "@/app/actions/notes";
import { parseQuery, prepareDocs, searchDocs } from "../search";
import { filename, folder as parentOf, joinSlug, sanitizeName } from "../slug";
import { extractTargets, resolveWikilink, resolvedTargets } from "../wikilinks";
import { clip } from "./chat-context";
import { getFolders } from "./folders";
import { getAllNotes, getNote } from "./notes";
import { createClient } from "./supabase";
import {
  getBacklinks,
  getNoteTitles,
  getResolver,
  getSearchDocs,
} from "./vault-data";

const RESULTS = 8;
const BODY_LIMIT = 20_000;
const LISTING = 100;

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

    recent_changes: tool({
      description: "Notes edited recently, newest first.",
      inputSchema: z.object({
        days: z
          .number()
          .int()
          .min(1)
          .max(365)
          .optional()
          .describe("How far back to look; 7 when omitted"),
      }),
      execute: async ({ days }) => {
        const cutoff = Date.now() - (days ?? 7) * 24 * 60 * 60 * 1000;
        const notes = (await getAllNotes())
          .filter((note) => Date.parse(note.updated) >= cutoff)
          .sort((a, b) => b.updated.localeCompare(a.updated))
          .slice(0, LISTING);
        return {
          notes: notes.map(({ slug, title, updated }) => ({
            slug,
            title,
            updated,
          })),
        };
      },
    }),

    list_notes: tool({
      description:
        "List the vault's notes and folders, optionally under one folder.",
      inputSchema: z.object({
        folder: z
          .string()
          .optional()
          .describe("A folder path; omit for the whole vault"),
      }),
      execute: async ({ folder }) => {
        const prefix = folder?.trim().replace(/^\/+|\/+$/g, "") ?? "";
        const inside = (path: string) =>
          prefix === "" || path === prefix || path.startsWith(`${prefix}/`);

        const notes = (await getAllNotes()).filter((note) =>
          inside(note.slug),
        );
        const folders = new Set((await getFolders()).filter(inside));
        for (const note of notes) {
          const parent = parentOf(note.slug);
          if (parent && inside(parent)) folders.add(parent);
        }

        return {
          folders: [...folders].sort(),
          notes: notes
            .slice(0, LISTING * 3)
            .map(({ slug, title }) => ({ slug, title })),
          total: notes.length,
        };
      },
    }),

    list_tags: tool({
      description: "Every tag in the vault, with how many notes carry it.",
      inputSchema: z.object({}),
      execute: async () => {
        const counts = new Map<string, number>();
        for (const doc of await getSearchDocs()) {
          for (const tag of doc.tags) {
            counts.set(tag, (counts.get(tag) ?? 0) + 1);
          }
        }
        return {
          tags: [...counts.entries()]
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .map(([tag, count]) => ({ tag, count })),
        };
      },
    }),

    vault_health: tool({
      description:
        "Broken wikilinks and orphan notes — what is rotting in the vault.",
      inputSchema: z.object({}),
      execute: async () => {
        const [notes, resolver, backlinks] = await Promise.all([
          getAllNotes(),
          getResolver(),
          getBacklinks(),
        ]);

        const broken: { note: string; target: string }[] = [];
        const orphans: { slug: string; title: string }[] = [];
        for (const note of notes) {
          const targets = extractTargets(note.body);
          for (const target of targets) {
            if (resolveWikilink(resolver, target) === null) {
              broken.push({ note: note.slug, target });
            }
          }
          const linked =
            resolvedTargets(note, resolver).size > 0 ||
            (backlinks.get(note.slug)?.length ?? 0) > 0;
          if (!linked) orphans.push({ slug: note.slug, title: note.title });
        }

        return {
          broken: broken.slice(0, LISTING),
          orphans: orphans.slice(0, LISTING),
        };
      },
    }),

    draw_graph: tool({
      description:
        "Sketch a small concept map that renders inside the conversation: concepts and the relations between them, whether or not the vault links them. Name real notes by their exact titles and they become links.",
      inputSchema: z.object({
        nodes: z
          .array(z.string().min(1))
          .min(2)
          .max(20)
          .describe("Concept names; a note's exact title when it is a note"),
        edges: z
          .array(
            z.object({
              from: z.string(),
              to: z.string(),
              label: z
                .string()
                .optional()
                .describe("Short relation, e.g. 'enables'"),
            }),
          )
          .max(40),
      }),
      execute: async ({ nodes, edges }) => {
        const resolver = await getResolver();
        const seen = new Set<string>();
        const named = nodes
          .map((label) => label.trim())
          .filter((label) => {
            const key = label.toLowerCase();
            if (!label || seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .map((label) => ({ label, slug: resolveWikilink(resolver, label) }));

        const drawn = edges
          .map((edge) => ({ ...edge, from: edge.from.trim(), to: edge.to.trim() }))
          .filter(
            (edge) =>
              seen.has(edge.from.toLowerCase()) &&
              seen.has(edge.to.toLowerCase()),
          )
          .map(({ from, to, label }) =>
            label ? { from, to, label } : { from, to },
          );

        return { nodes: named, edges: drawn };
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

    // The writes: each one waits for the reader's approval before it runs.
    create_note: tool({
      description:
        "Create a new note. The user is shown the note and approves it first.",
      inputSchema: z.object({
        slug: z
          .string()
          .describe("Where it goes, folders included, e.g. work/new-idea"),
        body: z.string().optional().describe("Initial markdown content"),
      }),
      needsApproval: true,
      execute: async ({ slug, body }) => {
        const name = sanitizeName(slug);
        if (!name) return { error: `“${slug}” is not a usable name.` };

        const created = await createNote(name);
        if (created.error) return { error: created.error };

        if (body) {
          const supabase = await createClient();
          const { error } = await supabase
            .from("notes")
            .update({ body })
            .eq("slug", name);
          if (error) return { created: name, error: error.message };
          revalidatePath("/", "layout");
        }
        return { created: name };
      },
    }),

    append_to_note: tool({
      description:
        "Add markdown to the end of an existing note. The user approves it first.",
      inputSchema: z.object({
        note: z.string().describe("The note's title, filename, or slug"),
        text: z.string().describe("Markdown to append"),
      }),
      needsApproval: true,
      execute: async ({ note: target, text }) => {
        const slug = resolveWikilink(await getResolver(), target);
        const note = slug ? await getNote(slug) : null;
        if (!note) return { error: `No note called “${target}”.` };

        const supabase = await createClient();
        const { data, error } = await supabase
          .from("notes")
          .update({ body: note.body ? `${note.body}\n\n${text}` : text })
          .eq("slug", note.slug)
          .eq("updated_at", note.updated)
          .select("updated_at")
          .maybeSingle();

        if (error) return { error: error.message };
        if (!data) {
          return { error: "The note changed while writing — try again." };
        }
        revalidatePath("/", "layout");
        return { appended: note.slug };
      },
    }),

    replace_in_note: tool({
      description:
        "Replace one exact passage in a note with new text. The passage must appear exactly once; the user sees the change as a diff and approves it first.",
      inputSchema: z.object({
        note: z.string().describe("The note's title, filename, or slug"),
        find: z.string().min(1).describe("The exact text to replace"),
        replace: z.string().describe("What it becomes"),
      }),
      needsApproval: true,
      execute: async ({ note: target, find, replace }) => {
        const slug = resolveWikilink(await getResolver(), target);
        const note = slug ? await getNote(slug) : null;
        if (!note) return { error: `No note called “${target}”.` };

        const matches = note.body.split(find).length - 1;
        if (matches === 0) {
          return { error: "That text is not in the note — read it again." };
        }
        if (matches > 1) {
          return {
            error: `That text appears ${matches} times — include more context to pin down one.`,
          };
        }

        const supabase = await createClient();
        const { data, error } = await supabase
          .from("notes")
          .update({ body: note.body.replace(find, replace) })
          .eq("slug", note.slug)
          .eq("updated_at", note.updated)
          .select("updated_at")
          .maybeSingle();

        if (error) return { error: error.message };
        if (!data) {
          return { error: "The note changed while writing — try again." };
        }
        revalidatePath("/", "layout");
        return { replaced: note.slug };
      },
    }),

    move_note: tool({
      description:
        "Move a note into a folder. The user approves it first.",
      inputSchema: z.object({
        note: z.string().describe("The note's title, filename, or slug"),
        folder: z
          .string()
          .describe("Target folder path; empty string for the vault root"),
      }),
      needsApproval: true,
      execute: async ({ note: target, folder }) => {
        const slug = resolveWikilink(await getResolver(), target);
        if (!slug) return { error: `No note called “${target}”.` };

        const into = folder.trim().replace(/^\/+|\/+$/g, "");
        const moved = await moveNote(slug, into);
        if (moved.error) return { error: moved.error };
        return { moved: joinSlug(into, filename(slug)) };
      },
    }),
  };
}
