import type { Note } from "./note";

const TODO_SOURCE = String.raw`!!(x?)\[([^\[\]]*)\](?:\[([^\[\]]*)\])?`;

const CODE_SPLIT = /(```[\s\S]*?```|`[^`\n]*`)/g;

const DUE_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

export function todoRegex(): RegExp {
  return new RegExp(TODO_SOURCE, "g");
}

export type Todo = {
  done: boolean;
  text: string;
  due: string | null;
  offset: number;
  index: number;
};

export type VaultTodo = Todo & { slug: string; title: string };

export function formatTodo(done: boolean, text: string, due: string | null) {
  return `!!${done ? "x" : ""}[${text}]${due === null ? "" : `[${due}]`}`;
}

export const INBOX_SLUG = "Todos";

export function appendTodo(
  body: string,
  text: string,
  due: string | null,
): string {
  const line = formatTodo(false, text, due);
  const trimmed = body.replace(/\s+$/, "");
  return trimmed === "" ? `${line}\n` : `${trimmed}\n\n${line}\n`;
}

export function parseTodos(body: string): Todo[] {
  const todos: Todo[] = [];
  let offset = 0;

  body.split(CODE_SPLIT).forEach((segment, part) => {
    if (part % 2 === 0) {
      for (const match of segment.matchAll(todoRegex())) {
        todos.push({
          done: match[1] === "x",
          text: match[2].trim(),
          due: match[3]?.trim() || null,
          offset: offset + (match.index ?? 0),
          index: todos.length,
        });
      }
    }
    offset += segment.length;
  });

  return todos;
}

export function toggleTodoInBody(body: string, index: number): string {
  let seen = 0;

  return body
    .split(CODE_SPLIT)
    .map((segment, part) =>
      part % 2 === 1
        ? segment
        : segment.replace(todoRegex(), (full, done, text, due) =>
            seen++ === index
              ? formatTodo(
                  done !== "x",
                  text as string,
                  (due as string) ?? null,
                )
              : full,
          ),
    )
    .join("");
}

export function editTodoInBody(
  body: string,
  index: number,
  next: { text: string; due: string | null },
): string {
  let seen = 0;

  return body
    .split(CODE_SPLIT)
    .map((segment, part) =>
      part % 2 === 1
        ? segment
        : segment.replace(todoRegex(), (full, done) =>
            seen++ === index
              ? formatTodo(done === "x", next.text, next.due)
              : full,
          ),
    )
    .join("");
}

export function splitDue(due: string | null): { date: string; time: string } {
  const match = due?.match(DUE_PATTERN);
  if (!match) return { date: "", time: "" };
  return {
    date: `${match[1]}-${match[2]}-${match[3]}`,
    time: match[4] ? `${match[4]}:${match[5]}` : "",
  };
}

export function joinDue(date: string, time: string): string | null {
  if (!date) return null;
  return time ? `${date}T${time}` : date;
}

export function collectTodos(notes: Note[]): VaultTodo[] {
  return notes.flatMap((note) =>
    parseTodos(note.body).map((todo) => ({
      ...todo,
      slug: note.slug,
      title: note.title,
    })),
  );
}

export function dueDate(due: string | null): Date | null {
  const match = due?.match(DUE_PATTERN);
  if (!match) return null;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] ?? 0),
    Number(match[5] ?? 0),
    Number(match[6] ?? 0),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

export function hasTime(due: string | null): boolean {
  return (due?.match(DUE_PATTERN)?.[4] ?? null) !== null;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function dayKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function sortTodos(todos: VaultTodo[]): VaultTodo[] {
  return [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const left = dueDate(a.due);
    const right = dueDate(b.due);
    if (left && right) return left.getTime() - right.getTime();
    if (left) return -1;
    if (right) return 1;
    return a.text.localeCompare(b.text);
  });
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatDue(due: string | null, now = new Date()): string | null {
  if (due === null) return null;

  const date = dueDate(due);
  if (!date) return due;

  const year =
    date.getFullYear() === now.getFullYear() ? "" : ` ${date.getFullYear()}`;
  const day = `${date.getDate()} ${MONTHS[date.getMonth()]}${year}`;
  if (!hasTime(due)) return day;

  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${day} ${hours}:${minutes}`;
}

export function isPast(due: string | null, now = new Date()): boolean {
  const date = dueDate(due);
  if (!date) return false;
  return hasTime(due)
    ? date.getTime() < now.getTime()
    : date.getTime() < startOfDay(now).getTime();
}

export function isOverdue(todo: Todo, now = new Date()): boolean {
  return !todo.done && isPast(todo.due, now);
}
