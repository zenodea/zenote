import type { Graph } from "./model";
import { indexGraph } from "./model";

export type Cluster = { nodes: number[]; slugs: string[] };

const ROUNDS = 12;
const MIN_SIZE = 3;
const MOST = 12;

/**
 * Label propagation: every note takes the label most of its neighbours hold, a
 * few times over. No parameters to tune and no distance metric — the vault's own
 * linking decides where one region ends and the next begins.
 */
export function findClusters(graph: Graph): Cluster[] {
  const { neighbours } = indexGraph(graph);
  const count = graph.nodes.length;
  const labels = new Int32Array(count);
  for (let i = 0; i < count; i++) labels[i] = i;

  // Fixed visiting order, so the same vault always yields the same regions.
  const order = Array.from({ length: count }, (_, i) => i);

  for (let round = 0; round < ROUNDS; round++) {
    let moved = false;

    for (const node of order) {
      const tally = new Map<number, number>();
      for (const other of neighbours[node]) {
        tally.set(labels[other], (tally.get(labels[other]) ?? 0) + 1);
      }
      if (tally.size === 0) continue;

      let best = labels[node];
      let bestCount = -1;
      for (const [label, seen] of tally) {
        // Ties go to the lower label, again for stability across runs.
        if (seen > bestCount || (seen === bestCount && label < best)) {
          best = label;
          bestCount = seen;
        }
      }

      if (best !== labels[node]) {
        labels[node] = best;
        moved = true;
      }
    }

    if (!moved) break;
  }

  const grouped = new Map<number, number[]>();
  for (let i = 0; i < count; i++) {
    const members = grouped.get(labels[i]);
    if (members) members.push(i);
    else grouped.set(labels[i], [i]);
  }

  return [...grouped.values()]
    .filter((nodes) => nodes.length >= MIN_SIZE)
    .sort((a, b) => b.length - a.length)
    .slice(0, MOST)
    .map((nodes) => ({
      nodes,
      slugs: nodes.map((node) => graph.nodes[node].id),
    }));
}
