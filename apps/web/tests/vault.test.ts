import assert from "node:assert/strict";
import type { Note } from "../src/lib/note";
import { planLinkRewrites } from "../src/lib/vault/rewrite-links";
import { conflictSlug, resolveConflict } from "../src/lib/vault/conflicts";
import { drawingBody } from "../src/lib/drawing";
import { withNoteLinks } from "../src/lib/drawing-links";
import { buildResolver, extractTargets } from "../src/lib/wikilinks";
import {
  collectTodos,
  dueDate,
  formatDue,
  hasTime,
  isPast,
  parseTodos,
  toggleTodoInBody,
} from "../src/lib/todos";
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
  assert.equal(
    conflictSlug("a", taken, "2026-08-19"),
    "a (conflict 2026-08-19 2)",
  );
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
  const rows = resolveConflict(
    local(note("n1", "a", "same")),
    server,
    () => false,
  );
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

{
  const scene = JSON.stringify({
    type: "excalidraw",
    elements: [
      { type: "text", text: "see [[old]]", originalText: "see [[old]]" },
      { type: "rectangle" },
    ],
  });
  const drawing = note("n3", "sketch", drawingBody(scene));
  const target = note("n4", "old", "");

  assert.deepEqual(extractTargets(drawing.body), ["old"]);

  const rewrites = planLinkRewrites(
    [drawing, { ...target, slug: "new", title: "new" }],
    [{ from: "old", to: "new" }],
  );
  assert.equal(rewrites.length, 1);
  assert.ok(rewrites[0].body.includes("[[new]]"));
  assert.ok(!rewrites[0].body.includes("[[old]]"));

  assert.equal(
    planLinkRewrites([drawing, target], [{ from: "x", to: "y" }]).length,
    0,
  );
}

{
  const resolver = buildResolver([note("n5", "folder/target", "")]);
  const elements = [
    { type: "text", text: "go to [[target]]" },
    { type: "text", text: "no link here" },
    { type: "text", text: "[[target]]", link: "https://example.com" },
  ];
  const linked = withNoteLinks(elements, resolver);

  assert.equal(linked[0].link, "/notes/folder/target");
  assert.equal(linked[1].link, undefined);
  assert.equal(linked[2].link, "https://example.com");
  assert.equal(withNoteLinks(linked, resolver), linked);
}

{
  const body = [
    "!![call the bank][2026-09-11T18:20]",
    "!!x[buy milk][2026-09-12]",
    "!![someday]",
    "`!![in code][2026-01-01]`",
    "```",
    "!![in a fence]",
    "```",
  ].join("\n");

  const todos = parseTodos(body);
  assert.equal(todos.length, 3);
  assert.deepEqual(
    todos.map((todo) => [todo.text, todo.due, todo.done]),
    [
      ["call the bank", "2026-09-11T18:20", false],
      ["buy milk", "2026-09-12", true],
      ["someday", null, false],
    ],
  );

  for (const todo of todos) {
    assert.equal(body.slice(todo.offset, todo.offset + 2), "!!");
  }

  const done = toggleTodoInBody(body, 0);
  assert.ok(done.includes("!!x[call the bank][2026-09-11T18:20]"));
  assert.ok(done.includes("`!![in code][2026-01-01]`"));
  assert.equal(parseTodos(done)[0].done, true);
  assert.equal(toggleTodoInBody(done, 0), body);

  assert.equal(parseTodos(toggleTodoInBody(body, 1))[1].done, false);

  assert.equal(hasTime("2026-09-11T18:20"), true);
  assert.equal(hasTime("2026-09-12"), false);
  assert.equal(dueDate("not a date"), null);
  assert.equal(formatDue("2026-09-12", new Date(2026, 0, 1)), "12 Sep");
  assert.equal(formatDue("2025-09-12", new Date(2026, 0, 1)), "12 Sep 2025");
  assert.equal(formatDue("nope"), "nope");
  assert.equal(isPast("2026-09-12", new Date(2026, 8, 13)), true);
  assert.equal(isPast("2026-09-12", new Date(2026, 8, 12)), false);

  const collected = collectTodos([note("n6", "inbox", body)]);
  assert.equal(collected.length, 3);
  assert.equal(collected[0].slug, "inbox");
  assert.deepEqual(
    collected.map((todo) => todo.index),
    [0, 1, 2],
  );
}

console.log("vault unit tests passed");
