import type { Graph } from "./model";

export function tagCounts(graph: Graph): [string, number][] {
  const counts = new Map<string, number>();
  for (const node of graph.nodes) {
    for (const tag of node.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
}

export function nodesWithTags(
  graph: Graph,
  tags: string[],
): Set<number> | null {
  if (tags.length === 0) return null;

  const wanted = new Set(tags);
  const shown = new Set<number>();
  graph.nodes.forEach((node, index) => {
    if (node.tags.some((tag) => wanted.has(tag))) shown.add(index);
  });
  return shown;
}
