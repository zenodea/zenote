import type {
  CompletionContext,
  CompletionResult,
} from "@codemirror/autocomplete";
import { dayKey } from "@/lib/todos";

const OPEN_DUE = /!!x?\[[^[\]]*\]\[([^[\]]*)$/;
const DUE_TEXT = /^[^[\]]*$/;

type Shortcut = { label: string; days: number; time?: string };

const SHORTCUTS: Shortcut[] = [
  { label: "today", days: 0 },
  { label: "tonight", days: 0, time: "20:00" },
  { label: "tomorrow", days: 1 },
  { label: "in 3 days", days: 3 },
  { label: "next week", days: 7 },
  { label: "in 2 weeks", days: 14 },
  { label: "next month", days: 30 },
];

function shift(from: Date, days: number): Date {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return date;
}

export function dueCompletions(now = () => new Date()) {
  return (context: CompletionContext): CompletionResult | null => {
    const match = context.matchBefore(OPEN_DUE);
    if (!match) return null;

    const today = now();
    const open = match.text.lastIndexOf("[");

    return {
      from: match.from + open + 1,
      options: SHORTCUTS.map((shortcut, order) => {
        const day = dayKey(shift(today, shortcut.days));
        const value = shortcut.time ? `${day}T${shortcut.time}` : day;
        return {
          label: shortcut.label,
          detail: value,
          boost: SHORTCUTS.length - order,
          apply: `${value}]`,
        };
      }),
      validFor: DUE_TEXT,
    };
  };
}
