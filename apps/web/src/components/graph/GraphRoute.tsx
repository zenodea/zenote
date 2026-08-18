"use client";

import { useTitle } from "@/hooks/use-title";
import { GraphMeta } from "@/components/graph/GraphMeta";
import { GraphView } from "@/components/graph/GraphView";
import { PageHeader } from "@/components/frame/PageHeader";
import { getGraph, useVault } from "@/lib/vault/store";

export function GraphRoute() {
  useVault();
  const graph = getGraph();
  useTitle("Graph");

  return (
    <>
      <PageHeader
        title="Graph"
        meta={
          <GraphMeta nodes={graph.nodes.length} links={graph.links.length} />
        }
      />
      <div className="min-h-0 flex-1 overflow-hidden">
        <GraphView graph={graph} standalone />
      </div>
    </>
  );
}
