"use client";

import type { Graph } from "@/lib/graph/model";
import { useSettings } from "@/lib/stores/settings";
import { GraphView } from "@/components/graph/GraphView";

export function NoteGraph({
  graph,
  focusId,
}: {
  graph: Graph;
  focusId: string;
}) {
  const settings = useSettings();

  if (!settings.showGraph || graph.nodes.length <= 1) return null;

  return (
    <section className="mt-16 border-t border-foreground/15 pt-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
        Graph
      </h2>
      <div className="mt-3 h-72 overflow-hidden rounded border border-foreground/15">
        <GraphView graph={graph} focusId={focusId} controls={false} />
      </div>
    </section>
  );
}
