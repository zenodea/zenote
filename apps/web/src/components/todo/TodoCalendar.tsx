"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ChevronIcon } from "@/components/ui/Icons";
import { TodoRow } from "@/components/todo/TodoRow";
import { dayKey, dueDate, sortTodos, type VaultTodo } from "@/lib/todos";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function monthGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - mondayIndex(first));

  return Array.from({ length: 42 }, (_, step) => {
    const day = new Date(start);
    day.setDate(start.getDate() + step);
    return day;
  });
}

export function TodoCalendar({
  todos,
  onToggle,
  onEdit,
}: {
  todos: VaultTodo[];
  onToggle: (todo: VaultTodo) => void;
  onEdit: (todo: VaultTodo, next: { text: string; due: string | null }) => void;
}) {
  const today = new Date();
  const [month, setMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selected, setSelected] = useState(() => dayKey(today));

  const byDay = new Map<string, VaultTodo[]>();
  for (const todo of todos) {
    const date = dueDate(todo.due);
    if (!date) continue;
    const key = dayKey(date);
    byDay.set(key, [...(byDay.get(key) ?? []), todo]);
  }

  const days = monthGrid(month);
  const undated = todos.filter((todo) => dueDate(todo.due) === null);
  const chosen = sortTodos(byDay.get(selected) ?? []);

  function shift(months: number) {
    setMonth(new Date(month.getFullYear(), month.getMonth() + months, 1));
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Button onClick={() => shift(-1)} aria-label="Previous month">
          <ChevronIcon className="w-3 rotate-180" />
        </Button>
        <p className="font-medium">
          {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
        </p>
        <Button onClick={() => shift(1)} aria-label="Next month">
          <ChevronIcon className="w-3" />
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs opacity-50">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = dayKey(day);
          const inMonth = day.getMonth() === month.getMonth();
          const open = (byDay.get(key) ?? []).filter((todo) => !todo.done);
          const total = byDay.get(key)?.length ?? 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              aria-pressed={key === selected}
              aria-label={`${day.getDate()} ${MONTH_NAMES[day.getMonth()]}, ${total} todo${total === 1 ? "" : "s"}`}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded py-1 text-sm ${
                key === selected
                  ? "bg-foreground/10 text-accent"
                  : inMonth
                    ? "hover:bg-foreground/10"
                    : "opacity-30 hover:bg-foreground/10"
              } ${key === dayKey(today) && key !== selected ? "text-accent" : ""}`}
            >
              {day.getDate()}
              <span
                aria-hidden
                className={`size-1.5 rotate-45 border ${
                  total === 0
                    ? "border-transparent"
                    : open.length > 0
                      ? "border-accent bg-accent"
                      : "border-foreground/40"
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {chosen.length === 0 ? (
          <p className="py-4 text-sm opacity-60">Nothing due this day.</p>
        ) : (
          <ul className="divide-y divide-foreground/15">
            {chosen.map((todo) => (
              <TodoRow
                key={`${todo.slug}-${todo.index}`}
                todo={todo}
                onToggle={onToggle}
                onEdit={onEdit}
              />
            ))}
          </ul>
        )}
      </div>

      {undated.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
            No date
          </h2>
          <ul className="divide-y divide-foreground/15">
            {sortTodos(undated).map((todo) => (
              <TodoRow
                key={`${todo.slug}-${todo.index}`}
                todo={todo}
                onToggle={onToggle}
                onEdit={onEdit}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
