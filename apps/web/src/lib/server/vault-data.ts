import "server-only";
import { cache } from "react";
import { buildBacklinks, type Backlink } from "../backlinks";
import { buildGraph, type Graph } from "../graph/model";
import type { NoteRef, SearchDoc, SearchDocMeta } from "../search";
import { noteTags } from "../tags";
import { buildResolver, type WikilinkResolver } from "../wikilinks";
import { loadAllNotes, type Note } from "./notes";
import { createClient, getUser } from "./supabase";

type Vault = {
  version: string;
  notes: Note[];
  resolver: WikilinkResolver;
  graph: Graph;
  backlinks: Map<string, Backlink[]>;
  searchDocs: SearchDoc[];
};

const RESIDENT = 4;

const vaults = new Map<string, Vault>();

const readVersion = cache(async (): Promise<string> => {
  const supabase = await createClient();

  const { data, count, error } = await supabase
    .from("notes")
    .select("updated_at", { count: "exact" })
    .order("updated_at", { ascending: false })
    .limit(1)
    .returns<{ updated_at: string }[]>();

  if (error) throw new Error(`Could not read the vault: ${error.message}`);

  return `${count ?? 0}:${data[0]?.updated_at ?? ""}`;
});

function build(version: string, notes: Note[]): Vault {
  const resolver = buildResolver(notes);

  return {
    version,
    notes,
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

const getVault = cache(async (): Promise<Vault> => {
  const [user, version] = await Promise.all([getUser(), readVersion()]);
  const key = user?.id ?? "anonymous";

  const held = vaults.get(key);
  if (held?.version === version) return held;

  const vault = build(version, await loadAllNotes());

  vaults.delete(key);
  vaults.set(key, vault);
  for (const stale of [...vaults.keys()].slice(0, -RESIDENT)) {
    vaults.delete(stale);
  }

  return vault;
});

export const getAllNotes = async (): Promise<Note[]> =>
  (await getVault()).notes;

export const getResolver = async () => (await getVault()).resolver;

export const getGraph = async () => (await getVault()).graph;

export const getBacklinks = async () => (await getVault()).backlinks;

export const getSearchDocs = async (): Promise<SearchDoc[]> =>
  (await getVault()).searchDocs;

export const getSearchDocMeta = async (): Promise<SearchDocMeta[]> =>
  (await getSearchDocs()).map(({ slug, title, tags, updated }) => ({
    slug,
    title,
    tags,
    updated,
  }));

export const getNoteRefs = async (): Promise<NoteRef[]> =>
  (await getAllNotes()).map(({ slug, title }) => ({ slug, title }));

export const getNoteTitles = async () =>
  Object.fromEntries(
    (await getAllNotes()).map((note) => [note.slug, note.title]),
  );
