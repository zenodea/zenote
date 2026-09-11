"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  formatDue,
  isOverdue,
  joinDue,
  splitDue,
  type VaultTodo,
} from "@/lib/todos";

export function TodoRow({
  todo,
  onToggle,
  onEdit,
  showNote = true,
}: {
  todo: VaultTodo;
  onToggle: (todo: VaultTodo) => void;
  onEdit: (todo: VaultTodo, next: { text: string; due: string | null }) => void;
  showNote?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const due = formatDue(todo.due);
  const late = isOverdue(todo);

  return (
    <li className="flex items-start gap-3 py-3">
      <button
        type="button"
        role="checkbox"
        aria-checked={todo.done}
        aria-label={todo.done ? "Mark as not done" : "Mark as done"}
        onClick={() => onToggle(todo)}
        className="mt-1 flex size-5 shrink-0 items-center justify-center coarse:size-8"
      >
        <span
          aria-hidden
          className={`size-3 rotate-45 border transition-colors ${
            todo.done
              ? "border-accent bg-accent"
              : "border-foreground/45 hover:border-accent"
          }`}
        />
      </button>

      {editing ? (
        <TodoEditor
          todo={todo}
          onCancel={() => setEditing(false)}
          onSave={(next) => {
            setEditing(false);
            if (next.text !== todo.text || next.due !== todo.due) {
              onEdit(todo, next);
            }
          }}
        />
      ) : (
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Edit “${todo.text}”`}
            className={`block w-full text-left hover:opacity-70 ${
              todo.done ? "line-through opacity-55" : ""
            }`}
          >
            {todo.text}
          </button>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs opacity-60">
            {due !== null && (
              <span className={late ? "text-danger opacity-100" : undefined}>
                {due}
              </span>
            )}
            {showNote && (
              <Link
                href={`/notes/${todo.slug}`}
                prefetch={false}
                className="truncate hover:text-accent"
              >
                {todo.title}
              </Link>
            )}
          </p>
        </div>
      )}
    </li>
  );
}

function TodoEditor({
  todo,
  onSave,
  onCancel,
}: {
  todo: VaultTodo;
  onSave: (next: { text: string; due: string | null }) => void;
  onCancel: () => void;
}) {
  const start = splitDue(todo.due);
  const [text, setText] = useState(todo.text);
  const [date, setDate] = useState(start.date);
  const [time, setTime] = useState(start.time);

  function save() {
    const trimmed = text.trim();
    if (!trimmed) {
      onCancel();
      return;
    }
    onSave({ text: trimmed, due: joinDue(date, time) });
  }

  return (
    <div className="min-w-0 flex-1">
      <Input
        autoFocus
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") save();
          if (event.key === "Escape") onCancel();
        }}
        aria-label="Todo text"
        className="w-full"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          aria-label="Due date"
          className="text-xs"
        />
        <Input
          type="time"
          value={time}
          disabled={date === ""}
          onChange={(event) => setTime(event.target.value)}
          aria-label="Due time"
          className="text-xs disabled:opacity-40"
        />
        <Button variant="accent" onClick={save} className="text-xs">
          Save
        </Button>
        <Button variant="solid" onClick={onCancel} className="text-xs">
          Cancel
        </Button>
      </div>
    </div>
  );
}
