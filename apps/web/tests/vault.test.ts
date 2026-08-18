import assert from "node:assert/strict";
import type { Note } from "../src/lib/note";
import { planLinkRewrites } from "../src/lib/vault/rewrite-links";
import { conflictSlug, resolveConflict } from "../src/lib/vault/conflicts";
import type { LocalNote } from "../src/lib/vault/types";

function note(id: string, slug: string, body: string): Note {
  return {
    id,
    slug,
    title: slug.split("/").pop()!,
    tags: [],
    created: "2026-01-01T00:00:00Z",
    updated: "2026-01-02T00:00:00Z",
    body,
  };
}

function local(base: Note, changes: Partial<LocalNote> = {}): LocalNote {
  return { ...base, pending: "update", localRev: 1, ...changes };
}

{
  const taken = (slug: string) => slug === "a (conflict 2026-08-19)";
  assert.equal(
    conflictSlug("a", () => false, "2026-08-19"),
    "a (conflict 2026-08-19)",
  );
  assert.equal(conflictSlug("a", taken, "2026-08-19"), "a (conflict 2026-08-19 2)");
}

{
  const server = note("n1", "a", "server body");
  const mine = local(note("n1", "a", "my body"));
  const rows = resolveConflict(mine, server, () => false);

  assert.equal(rows.length, 2);
  assert.equal(rows[0].body, "server body");
  assert.equal(rows[0].pending, null);
  assert.equal(rows[1].body, "my body");
  assert.equal(rows[1].pending, "create");
  assert.ok(rows[1].slug.startsWith("a (conflict "));
  assert.notEqual(rows[1].id, "n1");
}

{
  const server = note("n1", "a", "same");
  const rows = resolveConflict(local(note("n1", "a", "same")), server, () => false);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].pending, null);
}

{
  const notes = [
    note("n1", "work/next", "renamed away"),
    note("n2", "b", "See [[old]] and `[[old]]` here."),
  ];
  const rewrites = planLinkRewrites(notes, [{ from: "old", to: "work/next" }]);

  assert.equal(rewrites.length, 1);
  assert.equal(rewrites[0].id, "n2");
  assert.equal(rewrites[0].body, "See [[next]] and `[[old]]` here.");
}

{
  const notes = [note("n1", "a", "See [[b]]."), note("n2", "b", "")];
  assert.equal(planLinkRewrites(notes, [{ from: "b", to: "b" }]).length, 0);
}

console.log("vault unit tests passed");
