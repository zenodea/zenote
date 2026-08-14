import type { Note } from "../notes";
import { noteTags } from "../tags";
import { resolvedTargets, type WikilinkResolver } from "../wikilinks";

export type GraphNode = {
  id: string;
  title: string;
  degree: number;
  tags: string[];
};
export type GraphLink = { source: string; target: string };
export type Graph = { nodes: GraphNode[]; links: GraphLink[] };

// NUL can never appear in a slug, so the key cannot collide.
function edgeKey(a: string, b: string): string {
  return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
}

export function buildGraph(notes: Note[], resolver: WikilinkResolver): Graph {
  const edges = new Map<string, GraphLink>();
  const degree = new Map<string, number>();

  for (const note of notes) {
    for (const target of resolvedTargets(note, resolver)) {
      const key = edgeKey(note.slug, target);
      if (edges.has(key)) continue;

      edges.set(key, { source: note.slug, target });
      degree.set(note.slug, (degree.get(note.slug) ?? 0) + 1);
      degree.set(target, (degree.get(target) ?? 0) + 1);
    }
  }

  return {
    nodes: notes.map((note) => ({
      id: note.slug,
      title: note.title,
      degree: degree.get(note.slug) ?? 0,
      tags: noteTags(note),
    })),
    links: [...edges.values()],
  };
}

/** Index-based view of a graph: links as index pairs, undirected adjacency. */
export type IndexedGraph = {
  edges: ReadonlyArray<readonly [number, number]>;
  neighbours: number[][];
};

export function indexGraph(graph: Graph): IndexedGraph {
  const index = new Map(graph.nodes.map((node, i) => [node.id, i]));
  const edges = graph.links.map(
    (link) => [index.get(link.source)!, index.get(link.target)!] as const,
  );

  const neighbours: number[][] = graph.nodes.map(() => []);
  for (const [a, b] of edges) {
    neighbours[a].push(b);
    neighbours[b].push(a);
  }

  return { edges, neighbours };
}

/** The subgraph within `depth` hops of `id`: those nodes and the links
 * between them. Node degrees stay as in the full graph. */
export function localGraph(graph: Graph, id: string, depth = 1): Graph {
  const centre = graph.nodes.findIndex((node) => node.id === id);
  if (centre < 0) return { nodes: [], links: [] };

  const kept = neighbourhood(indexGraph(graph).neighbours, [centre], depth);
  const ids = new Set([...kept].map((index) => graph.nodes[index].id));

  return {
    nodes: graph.nodes.filter((node) => ids.has(node.id)),
    links: graph.links.filter(
      (link) => ids.has(link.source) && ids.has(link.target),
    ),
  };
}

/** Every node within `depth` hops of the seeds, seeds included. */
export function neighbourhood(
  neighbours: number[][],
  seeds: number[],
  depth: number,
): Set<number> {
  const reached = new Set(seeds);
  let frontier = seeds;

  for (let hop = 0; hop < depth && frontier.length > 0; hop++) {
    const next: number[] = [];
    for (const node of frontier) {
      for (const neighbour of neighbours[node]) {
        if (reached.has(neighbour)) continue;
        reached.add(neighbour);
        next.push(neighbour);
      }
    }
    frontier = next;
  }
  return reached;
}
