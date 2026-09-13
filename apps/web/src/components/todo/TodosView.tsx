"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/frame/PageHeader";
import { ChevronIcon } from "@/components/ui/Icons";
import { PageBody } from "@/components/ui/PageBody";
import { Segmented } from "@/components/ui/Segmented";
import { TodoCalendar } from "@/components/todo/TodoCalendar";
import { TodoComposer } from "@/components/todo/TodoComposer";
import { TodoRow } from "@/components/todo/TodoRow";
import { useTitle } from "@/hooks/use-title";
import {
  appendTodo,
  collectTodos,
  dueDate,
  editTodoInBody,
  INBOX_SLUG,
  sortTodos,
  startOfDay,
  toggleTodoInBody,
  type VaultTodo,
} from "@/lib/todos";
import { createNote, saveBody } from "@/lib/vault/mutations";
import { getBySlug, useVault } from "@/lib/vault/store";

const VIEWS = ["list", "calendar"] as const;

const BUCKETS = ["Overdue", "Today", "Soon", "Later", "No date", "Done"];

function bucketOf(todo: VaultTodo, now: Date): string {
  if (todo.done) return "Done";

  const date = dueDate(todo.due);
  if (!date) return "No date";

  const today = startOfDay(now);
  const day = startOfDay(date);
  const days = Math.round((day.getTime() - today.getTime()) / 86_400_000);

  if (date.getTime() < now.getTime() && days <= 0) return "Overdue";
  if (days <= 0) return "Today";
  return days <= 7 ? "Soon" : "Later";
}

async function toggleTodo(todo: VaultTodo) {
  const note = getBySlug().get(todo.slug);
  if (!note) return;
  await saveBody(todo.slug, toggleTodoInBody(note.body, todo.index));
}

async function editTodo(
  todo: VaultTodo,
  next: { text: string; due: string | null },
) {
  const note = getBySlug().get(todo.slug);
  if (!note) return;
  await saveBody(todo.slug, editTodoInBody(note.body, todo.index, next));
}

async function addTodo(next: { text: string; due: string | null }) {
  const note = getBySlug().get(INBOX_SLUG);
  const body = appendTodo(note?.body ?? "", next.text, next.due);

  if (!note) {
    const { error } = await createNote(INBOX_SLUG, body);
    if (error) alert(error);
    return;
  }
  await saveBody(INBOX_SLUG, body);
}

export function TodosView() {
  const { notes } = useVault();
  const [view, setView] = useState<(typeof VIEWS)[number]>("list");
  useTitle("Todos");

  const todos = useMemo(() => collectTodos(notes), [notes]);
  const open = todos.filter((todo) => !todo.done).length;

  const grouped = useMemo(() => {
    const now = new Date();
    const groups = new Map<string, VaultTodo[]>();
    for (const todo of sortTodos(todos)) {
      const bucket = bucketOf(todo, now);
      groups.set(bucket, [...(groups.get(bucket) ?? []), todo]);
    }
    return groups;
  }, [todos]);

  const toggle = (todo: VaultTodo) => void toggleTodo(todo);
  const edit = (todo: VaultTodo, next: { text: string; due: string | null }) =>
    void editTodo(todo, next);

  function rows(bucket: string) {
    return (
      <ul className="divide-y divide-foreground/15">
        {grouped.get(bucket)?.map((todo) => (
          <TodoRow
            key={`${todo.slug}-${todo.index}`}
            todo={todo}
            onToggle={toggle}
            onEdit={edit}
          />
        ))}
      </ul>
    );
  }

  return (
    <>
      <PageHeader
        title="Todos"
        meta={<span>{open === 1 ? "1 open" : `${open} open`}</span>}
      />
      <PageBody>
        <Segmented
          options={VIEWS}
          value={view}
          onChange={setView}
          ariaLabel="Todo view"
          size="md"
          className="w-56"
        />

        <TodoComposer onAdd={(next) => void addTodo(next)} />

        {todos.length === 0 && (
          <p className="mt-6 text-sm opacity-60">
            Nothing yet. Add one above, or write{" "}
            <code>!![call the bank][2026-09-11]</code> in any note and it turns
            up here.
          </p>
        )}

        {view === "calendar" ? (
          <div className="mt-6">
            <TodoCalendar todos={todos} onToggle={toggle} onEdit={edit} />
          </div>
        ) : (
          BUCKETS.filter((bucket) => grouped.has(bucket)).map((bucket) =>
            bucket === "Done" ? (
              <details key={bucket} className="disclosure group mt-8">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold uppercase tracking-wide opacity-60 hover:opacity-100 [&::-webkit-details-marker]:hidden">
                  <ChevronIcon className="w-3 shrink-0 transition-transform group-open:rotate-90" />
                  Done
                  <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium normal-case tracking-normal">
                    {grouped.get(bucket)?.length ?? 0}
                  </span>
                </summary>
                {rows(bucket)}
              </details>
            ) : (
              <section key={bucket} className="mt-8">
                <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
                  {bucket}
                </h2>
                {rows(bucket)}
              </section>
            ),
          )
        )}
      </PageBody>
    </>
  );
}
