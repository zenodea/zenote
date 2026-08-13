"use client";

import type { GraphNode } from "@/lib/graph/model";
import { GraphSearch } from "@/components/graph/GraphSearch";
import { TagFilter } from "@/components/graph/TagFilter";

const buttonClass =
  "h-7 rounded border border-foreground/15 bg-background/70 px-2 backdrop-blur hover:bg-foreground/10";

// The graph's top-right control row: search, tag filter, zoom and reset.
export function GraphToolbar({
  nodes,
  onSelectNode,
  tagCounts,
  activeTags,
  onTagsChange,
  visibleCount,
  total,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  nodes: GraphNode[];
  onSelectNode: (index: number) => void;
  tagCounts: ReadonlyArray<readonly [string, number]>;
  activeTags: string[];
  onTagsChange: (tags: string[]) => void;
  visibleCount: number | null;
  total: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  return (
    <div className="absolute right-2 top-2 z-10 flex max-w-[calc(100%-1rem)] flex-wrap justify-end gap-1 text-sm">
      <GraphSearch
        nodes={nodes}
        onSelect={onSelectNode}
        inputClass={buttonClass}
      />
      <TagFilter
        tagCounts={tagCounts}
        activeTags={activeTags}
        onChange={onTagsChange}
        visibleCount={visibleCount}
        total={total}
        buttonClass={buttonClass}
      />
      <button
        type="button"
        onClick={onZoomIn}
        className={buttonClass}
        aria-label="Zoom in"
      >
        +
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        className={buttonClass}
        aria-label="Zoom out"
      >
        −
      </button>
      <button type="button" onClick={onReset} className={buttonClass}>
        Reset
      </button>
    </div>
  );
}
