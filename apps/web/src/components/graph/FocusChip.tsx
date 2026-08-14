"use client";

import { Text } from "@/components/ui/Text";

type FocusChipProps = {
  label: string;
  depth: number;
  noteCount: number;
  onExpand: () => void;
  onShrink: () => void;
  onClear: () => void;
};

export function FocusChip({
  label,
  depth,
  noteCount,
  onExpand,
  onShrink,
  onClear,
}: FocusChipProps) {
  return (
    <div className="absolute left-2 top-2 z-10 flex max-w-[min(28rem,60%)] items-center gap-2 rounded border border-foreground/15 bg-background/70 px-2 py-1 text-sm backdrop-blur">
      <Text className="shrink-0 opacity-60">Focused</Text>
      <Text variant="strong" className="truncate">
        {label}
      </Text>
      <Text className="shrink-0 opacity-40">
        {depth} {depth === 1 ? "hop" : "hops"} · {noteCount} notes
      </Text>
      {depth > 1 && (
        <button
          type="button"
          onClick={onShrink}
          className="shrink-0 rounded border border-foreground/15 px-1 opacity-70 hover:opacity-100"
          aria-label="Shrink focus by one hop"
        >
          −
        </button>
      )}
      <button
        type="button"
        onClick={onExpand}
        className="shrink-0 rounded border border-foreground/15 px-1 opacity-70 hover:opacity-100"
        aria-label="Expand focus by one hop"
        title="Expand by one hop"
      >
        +
      </button>
      <button
        type="button"
        onClick={onClear}
        className="shrink-0 opacity-60 hover:opacity-100"
        aria-label="Clear focus"
      >
        ✕
      </button>
    </div>
  );
}
