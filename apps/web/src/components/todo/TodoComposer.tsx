"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { joinDue } from "@/lib/todos";

export function TodoComposer({
  onAdd,
}: {
  onAdd: (next: { text: string; due: string | null }) => void;
}) {
  const [text, setText] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [focused, setFocused] = useState(false);

  const open = focused || text !== "" || date !== "";

  function add() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd({ text: trimmed, due: joinDue(date, time) });
    setText("");
    setDate("");
    setTime("");
  }

  return (
    <div className="mt-6 flex items-start gap-3">
      <span
        aria-hidden
        className="mt-2.5 size-3 shrink-0 rotate-45 border border-dashed border-foreground/35"
      />
      <div className="min-w-0 flex-1">
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter") add();
            if (event.key === "Escape") {
              setText("");
              setDate("");
              setTime("");
              event.currentTarget.blur();
            }
          }}
          placeholder="Add a todo…"
          aria-label="New todo"
          className="w-full"
        />
        {open && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              aria-label="Due date"
              className="text-xs"
            />
            <Input
              type="time"
              value={time}
              disabled={date === ""}
              onChange={(event) => setTime(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              aria-label="Due time"
              className="text-xs disabled:opacity-40"
            />
            <Button
              variant="accent"
              disabled={text.trim() === ""}
              onMouseDown={(event) => event.preventDefault()}
              onClick={add}
              className="text-xs"
            >
              Add
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
