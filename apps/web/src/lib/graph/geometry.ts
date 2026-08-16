import type { GraphNode } from "@/lib/graph/model";

export type View = { x: number; y: number; scale: number };
export type Positions = { x: Float64Array; y: Float64Array };

export function baseRadiusFor(nodeCount: number) {
  return Math.max(1.8, Math.min(6, 9 / Math.pow(Math.max(nodeCount, 1), 0.2)));
}

export function nodeRadius(degree: number, baseRadius: number) {
  return baseRadius * (1 + Math.min(degree, 8) * 0.12);
}

/** The node under `point` (screen space), or null. Padded for small nodes. */
export function hitTest(
  point: { x: number; y: number },
  view: View,
  x: Float64Array,
  y: Float64Array,
  nodes: GraphNode[],
  baseRadius: number,
  visible: Set<number> | null,
): number | null {
  const { x: tx, y: ty, scale } = view;
  let best: number | null = null;
  let bestSquared = Infinity;

  for (let i = 0; i < x.length; i++) {
    if (visible !== null && !visible.has(i)) continue;
    const dx = x[i] * scale + tx - point.x;
    const dy = y[i] * scale + ty - point.y;
    const squared = dx * dx + dy * dy;
    const reach = Math.max(nodeRadius(nodes[i].degree, baseRadius) + 6, 12);

    if (squared < reach * reach && squared < bestSquared) {
      best = i;
      bestSquared = squared;
    }
  }
  return best;
}
