"use client";

import { useGraphReady } from "@/lib/stores/graph-ready";

export function GraphMeta({ nodes, links }: { nodes: number; links: number }) {
  const ready = useGraphReady();
  if (!ready) return null;

  return (
    <span>
      {nodes} notes · {links} links
    </span>
  );
}
