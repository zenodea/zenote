"use client";

import { useState } from "react";
import { Scroller } from "@/components/ui/Scroller";
import { Text } from "@/components/ui/Text";

type TagFilterProps = {
  tagCounts: ReadonlyArray<readonly [string, number]>;
  activeTags: string[];
  onChange: (tags: string[]) => void;
  visibleCount: number | null;
  total: number;
  buttonClass: string;
};

export function TagFilter({
  tagCounts,
  activeTags,
  onChange,
  visibleCount,
  total,
  buttonClass,
}: TagFilterProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`${buttonClass} ${activeTags.length > 0 ? "font-medium" : ""}`}
        aria-expanded={open}
      >
        Filter{activeTags.length > 0 ? ` (${activeTags.length})` : ""}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 flex max-h-[min(24rem,60vh)] w-56 flex-col rounded border border-foreground/15 bg-background/90 text-sm backdrop-blur">
          <div className="flex items-center justify-between border-b border-foreground/15 px-2 py-1">
            <Text className="opacity-60">
              {activeTags.length > 0
                ? `${visibleCount ?? 0} of ${total}`
                : `${tagCounts.length} tags`}
            </Text>
            <button
              type="button"
              onClick={() => onChange([])}
              className="opacity-60 hover:opacity-100 disabled:opacity-25"
              disabled={activeTags.length === 0}
            >
              Clear
            </button>
          </div>

          <Scroller className="min-h-0 flex-1" contentClassName="p-1">
            {tagCounts.map(([tag, count]) => {
              const checked = activeTags.includes(tag);
              return (
                <label
                  key={tag}
                  className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-foreground/10"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange(
                        checked
                          ? activeTags.filter((other) => other !== tag)
                          : [...activeTags, tag],
                      )
                    }
                  />
                  <Text className="flex-1 truncate">#{tag}</Text>
                  <Text className="opacity-40">{count}</Text>
                </label>
              );
            })}
          </Scroller>
        </div>
      )}
    </>
  );
}
