"use client";

import Link from "next/link";
import { formatDue, isOverdue, type VaultTodo } from "@/lib/todos";

export function TodoRow({
  todo,
  onToggle,
  showNote = true,
}: {
  todo: VaultTodo;
  onToggle: (todo: VaultTodo) => void;
  showNote?: boolean;
}) {
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

      <div className="min-w-0 flex-1">
        <p
          className={todo.done ? "line-through opacity-55" : "text-foreground"}
        >
          {todo.text}
        </p>
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
    </li>
  );
}
