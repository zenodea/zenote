import "server-only";
import { cache } from "react";
import { buildBacklinks, type Backlink } from "../backlinks";
import { buildGraph, type Graph } from "../graph/model";
import type { NoteRef, SearchDoc, SearchDocMeta } from "../search";
import { noteTags } from "../tags";
import { buildResolver, type WikilinkResolver } from "../wikilinks";
import { loadAllNotes, loadNotes, type Note } from "./notes";
import { createClient, getUserId } from "./supabase";

type Vault = {
  notes: Note[];
  bySlug: Map<string, Note>;
  resolver: WikilinkResolver;
  graph: Graph;
  backlinks: Map<string, Backlink[]>;
  searchDocs: SearchDoc[];
};

type Manifest = Map<string, string>;

const RESIDENT = 4;

const PAGE_SIZE = 1000;

const REFETCH_SHARE = 0.4;

const vaults = new Map<string, Vault>();

const readManifest = cache(async (vaultId: string): Promise<Manifest> => {
  const supabase = await createClient();
  const manifest: Manifest = new Map();

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("notes")
      .select("slug,updated_at")
      .eq("vault_id", vaultId)
      .order("slug")
      .range(from, from + PAGE_SIZE - 1)
      .returns<{ slug: string; updated_at: string }[]>();

    if (error) throw new Error(`Could not read the vault: ${error.message}`);

    for (const row of data) manifest.set(row.slug, row.updated_at);
    if (data.length < PAGE_SIZE) break;
  }

  return manifest;
});

function build(notes: Note[]): Vault {
  const resolver = buildResolver(notes);

  return {
    notes,
    bySlug: new Map(notes.map((note) => [note.slug, note])),
    resolver,
    graph: buildGraph(notes, resolver),
    backlinks: buildBacklinks(notes, resolver),
    searchDocs: notes.map((note) => ({
      slug: note.slug,
      title: note.title,
      tags: noteTags(note),
      updated: note.updated,
      body: note.body,
    })),
  };
}

async function reconcile(
  vaultId: string,
  held: Vault | undefined,
  manifest: Manifest,
): Promise<Note[] | null> {
  if (!held) return loadAllNotes(vaultId);

  const stale: string[] = [];
  for (const [slug, updated] of manifest) {
    if (held.bySlug.get(slug)?.updated !== updated) stale.push(slug);
  }

  if (stale.length === 0 && held.notes.length === manifest.size) return null;

  if (stale.length > manifest.size * REFETCH_SHARE) return loadAllNotes(vaultId);

  const fresh = new Map(
    (await loadNotes(vaultId, stale)).map((note) => [note.slug, note]),
  );

  const notes: Note[] = [];
  for (const slug of manifest.keys()) {
    const note = fresh.get(slug) ?? held.bySlug.get(slug);
    if (note) notes.push(note);
  }

  return notes.sort((a, b) => a.slug.localeCompare(b.slug));
}

const getVault = cache(async (vaultId: string): Promise<Vault> => {
  const [userId, manifest] = await Promise.all([
    getUserId(),
    readManifest(vaultId),
  ]);
  const key = `${userId ?? "anonymous"}:${vaultId}`;

  const held = vaults.get(key);
  const notes = await reconcile(vaultId, held, manifest);
  if (!notes) return held!;

  const vault = build(notes);

  vaults.delete(key);
  vaults.set(key, vault);
  for (const stale of [...vaults.keys()].slice(0, -RESIDENT)) {
    vaults.delete(stale);
  }

  return vault;
});

export const getAllNotes = async (vaultId: string): Promise<Note[]> =>
  (await getVault(vaultId)).notes;

export const getVaultNote = async (
  vaultId: string,
  slug: string,
): Promise<Note | null> => (await getVault(vaultId)).bySlug.get(slug) ?? null;

export const getResolver = async (vaultId: string) =>
  (await getVault(vaultId)).resolver;

export const getGraph = async (vaultId: string) =>
  (await getVault(vaultId)).graph;

export const getBacklinks = async (vaultId: string) =>
  (await getVault(vaultId)).backlinks;

export const getSearchDocs = async (vaultId: string): Promise<SearchDoc[]> =>
  (await getVault(vaultId)).searchDocs;

export const getSearchDocMeta = async (
  vaultId: string,
): Promise<SearchDocMeta[]> =>
  (await getSearchDocs(vaultId)).map(({ slug, title, tags, updated }) => ({
    slug,
    title,
    tags,
    updated,
  }));

export const getNoteRefs = async (vaultId: string): Promise<NoteRef[]> =>
  (await getAllNotes(vaultId)).map(({ slug, title }) => ({ slug, title }));

export const getNoteTitles = async (vaultId: string) =>
  Object.fromEntries(
    (await getAllNotes(vaultId)).map((note) => [note.slug, note.title]),
  );
