"use client";

import { buildBacklinks, type Backlink } from "../backlinks";
import { buildGraph, type Graph } from "../graph/model";
import type { SearchDoc } from "../search";
import { createStore } from "../store";
import { noteTags } from "../tags";
import { buildResolver, type WikilinkResolver } from "../wikilinks";
import type { VaultEntry } from "./registry";
import type { LocalFolder, LocalNote, Tombstone } from "./types";

export type VaultState = {
  status: "loading" | "setup" | "ready";
  vault: VaultEntry | null;
  vaults: VaultEntry[];
  ownerId: string | null;
  email: string | null;
  notes: LocalNote[];
  folders: LocalFolder[];
  tombstones: Tombstone[];
};

export const vaultStore = createStore<VaultState>({
  status: "loading",
  vault: null,
  vaults: [],
  ownerId: null,
  email: null,
  notes: [],
  folders: [],
  tombstones: [],
});

export const useVault = vaultStore.use;

export function sortNotes(notes: LocalNote[]): LocalNote[] {
  return [...notes].sort((a, b) => a.slug.localeCompare(b.slug));
}

export function folderPaths(folders: LocalFolder[]): string[] {
  return folders.map((folder) => folder.path).sort();
}

type Derived = {
  bySlug: Map<string, LocalNote>;
  byId: Map<string, LocalNote>;
  resolver: WikilinkResolver;
  graph: Graph;
  backlinks: Map<string, Backlink[]>;
  searchDocs: SearchDoc[];
};

let derivedFrom: LocalNote[] | null = null;
let derived: Derived | null = null;

function getDerived(): Derived {
  const { notes } = vaultStore.get();
  if (derived && derivedFrom === notes) return derived;

  const resolver = buildResolver(notes);
  derivedFrom = notes;
  derived = {
    bySlug: new Map(notes.map((note) => [note.slug, note])),
    byId: new Map(notes.map((note) => [note.id, note])),
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
  return derived;
}

export const getBySlug = () => getDerived().bySlug;
export const getById = () => getDerived().byId;
export const getResolver = () => getDerived().resolver;
export const getGraph = () => getDerived().graph;
export const getBacklinks = () => getDerived().backlinks;
export const getSearchDocs = () => getDerived().searchDocs;
