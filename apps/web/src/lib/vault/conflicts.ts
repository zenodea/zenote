"use client";

import type { Note } from "../note";
import { filename } from "../slug";
import { getBySlug } from "./store";
import type { LocalNote } from "./types";

export function clean(note: Note): LocalNote {
  return { ...note, pending: null, localRev: 0 };
}

export function conflictSlug(
  slug: string,
  taken: (candidate: string) => boolean,
  date: string = new Date().toISOString().slice(0, 10),
): string {
  let candidate = `${slug} (conflict ${date})`;
  for (let n = 2; taken(candidate); n += 1) {
    candidate = `${slug} (conflict ${date} ${n})`;
  }
  return candidate;
}

function conflictCopy(
  source: Pick<Note, "tags" | "created" | "body">,
  baseSlug: string,
  taken: (candidate: string) => boolean,
): LocalNote {
  const slug = conflictSlug(baseSlug, taken);
  return {
    id: crypto.randomUUID(),
    slug,
    title: filename(slug),
    tags: source.tags,
    created: source.created,
    updated: "",
    body: source.body,
    pending: "create",
    localRev: 1,
  };
}

export function resolveConflict(
  local: LocalNote,
  server: Note,
  taken: (candidate: string) => boolean,
): LocalNote[] {
  const diverged =
    local.body !== server.body ||
    local.title !== server.title ||
    local.tags.join(" ") !== server.tags.join(" ");

  return diverged
    ? [clean(server), conflictCopy(local, server.slug, taken)]
    : [clean(server)];
}

export function rebaseKeepingLocal(
  local: LocalNote,
  server: Note,
  taken: (candidate: string) => boolean,
): LocalNote[] {
  const rebased = { ...local, updated: server.updated };

  return local.body !== server.body || local.title !== server.title
    ? [rebased, conflictCopy(server, server.slug, taken)]
    : [rebased];
}

export function takenChecker(): {
  taken: (slug: string) => boolean;
  claim: (slug: string) => void;
} {
  const claimed = new Set<string>();
  return {
    taken: (slug) => claimed.has(slug) || getBySlug().has(slug),
    claim: (slug) => void claimed.add(slug),
  };
}
