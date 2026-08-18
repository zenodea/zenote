import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { buildBacklinks } from "../backlinks";
import { parseQuery, prepareDocs, searchDocs, type SearchDoc } from "../search";
import { filename, folder as parentOf, joinSlug, sanitizeName } from "../slug";
import { noteTags } from "../tags";
import {
  buildResolver,
  extractTargets,
  resolveWikilink,
  resolvedTargets,
  type WikilinkResolver,
} from "../wikilinks";
import { planLinkRewrites, type SlugRename } from "../vault/rewrite-links";
import { clip } from "./chat-context";
import { getFolders } from "./folders";
import { loadAllNotes, type Note } from "./notes";
import { createClient } from "./supabase";

const DUPLICATE = "23505";

async function rewriteLinks(
  vaultId: string,
  renames: SlugRename[],
): Promise<void> {
  const supabase = await createClient();
  const notes = await loadAllNotes(vaultId);
  for (const rewrite of planLinkRewrites(notes, renames)) {
    const { error } = await supabase
      .from("notes")
      .update({ body: rewrite.body })
      .eq("id", rewrite.id);
    if (error) {
      console.error(`Could not rewrite links in “${rewrite.id}”:`, error.message);
    }
  }
}

const RESULTS = 8;
const BODY_LIMIT = 20_000;
const LISTING = 100;

type Vault = { notes: Note[]; resolver: WikilinkResolver };

function vaultView(vaultId: string) {
  let held: Promise<Vault> | null = null;

  const read = () =>
    (held ??= loadAllNotes(vaultId).then((notes) => ({
      notes,
      resolver: buildResolver(notes),
    })));

  const find = async (target: string): Promise<Note | null> => {
    const { notes, resolver } = await read();
    const slug = resolveWikilink(resolver, target);
    return notes.find((note) => note.slug === slug) ?? null;
  };

  return {
    read,
    find,
    changed: () => {
      held = null;
    },
  };
}

function toSearchDocs(notes: Note[]): SearchDoc[] {
  return notes.map((note) => ({
    slug: note.slug,
    title: note.title,
    tags: noteTags(note),
    updated: note.updated,
    body: note.body,
  }));
}

export function vaultTools(vaultId: string) {
  const vault = vaultView(vaultId);

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
        const { notes } = await vault.read();
        const hits = searchDocs(
          prepareDocs(toSearchDocs(notes)),
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
        const note = await vault.find(target);
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
        const { notes, resolver } = await vault.read();
        const note = await vault.find(target);
        if (!note) return { error: `No note called “${target}”.` };

        const titles = new Map(notes.map((n) => [n.slug, n.title]));
        const backlinks = buildBacklinks(notes, resolver).get(note.slug) ?? [];
        return {
          linksTo: [...resolvedTargets(note, resolver)].map((s) => ({
            slug: s,
            title: titles.get(s) ?? s,
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
        const notes = (await vault.read()).notes
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

        const notes = (await vault.read()).notes.filter((note) =>
          inside(note.slug),
        );
        const folders = new Set((await getFolders(vaultId)).filter(inside));
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
        for (const doc of toSearchDocs((await vault.read()).notes)) {
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
        const { notes, resolver } = await vault.read();
        const backlinks = buildBacklinks(notes, resolver);

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
        const { resolver } = await vault.read();
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

        const supabase = await createClient();
        const { error } = await supabase
          .from("notes")
          .insert({
            vault_id: vaultId,
            slug: name,
            title: filename(name),
            body: body ?? "",
          });
        if (error) {
          return {
            error:
              error.code === DUPLICATE
                ? `“${name}” already exists.`
                : error.message,
          };
        }
        vault.changed();
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
        const note = await vault.find(target);
        if (!note) return { error: `No note called “${target}”.` };

        const supabase = await createClient();
        const { data, error } = await supabase
          .from("notes")
          .update({ body: note.body ? `${note.body}\n\n${text}` : text })
          .eq("vault_id", vaultId)
          .eq("slug", note.slug)
          .eq("updated_at", note.updated)
          .select("updated_at")
          .maybeSingle();

        if (error) return { error: error.message };
        if (!data) {
          return { error: "The note changed while writing — try again." };
        }
        vault.changed();
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
        const note = await vault.find(target);
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
          .eq("vault_id", vaultId)
          .eq("slug", note.slug)
          .eq("updated_at", note.updated)
          .select("updated_at")
          .maybeSingle();

        if (error) return { error: error.message };
        if (!data) {
          return { error: "The note changed while writing — try again." };
        }
        vault.changed();
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
        const note = await vault.find(target);
        if (!note) return { error: `No note called “${target}”.` };

        const into = folder.trim() === "" ? "" : sanitizeName(folder);
        if (into === null) {
          return { error: `“${folder}” is not a usable folder.` };
        }

        const next = joinSlug(into, filename(note.slug));
        const supabase = await createClient();
        const { error } = await supabase
          .from("notes")
          .update({ slug: next })
          .eq("vault_id", vaultId)
          .eq("slug", note.slug);
        if (error) {
          return {
            error:
              error.code === DUPLICATE
                ? `“${next}” already exists.`
                : error.message,
          };
        }
        await rewriteLinks(vaultId, [{ from: note.slug, to: next }]);
        vault.changed();
        return { moved: next };
      },
    }),
  };
}
