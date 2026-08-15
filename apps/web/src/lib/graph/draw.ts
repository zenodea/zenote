import type { GraphNode } from "@/lib/graph/model";

const LABEL_SCALE = 2.0;
const LABEL_HUB_SCALE = 0.8;
const LABEL_FADE = 0.2;
const BUCKETS = 12;

export type View = { x: number; y: number; scale: number };

export type DrawParams = {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
  view: View;
  foreground: string;
  accent: string;
  fitScale: number;
  x: Float64Array;
  y: Float64Array;
  nodes: GraphNode[];
  edges: ReadonlyArray<readonly [number, number]>;
  baseRadius: number;
  highlight: Float32Array;
  labelFocus: Float32Array;
  focusAmount: number;
  seeds: number[];
  visible: Set<number> | null;
};

export function baseRadiusFor(nodeCount: number) {
  return Math.max(1.8, Math.min(6, 9 / Math.pow(Math.max(nodeCount, 1), 0.2)));
}

export function nodeRadius(degree: number, baseRadius: number) {
  return baseRadius * (1 + Math.min(degree, 8) * 0.12);
}

/** Which alpha bucket a 0..1 fade value falls in. */
function bucketOf(value: number) {
  return Math.min(BUCKETS - 1, Math.floor(value * BUCKETS));
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

export function drawGraph({
  context,
  width,
  height,
  view,
  foreground,
  accent,
  fitScale,
  x,
  y,
  nodes,
  edges,
  baseRadius,
  highlight,
  labelFocus,
  focusAmount,
  seeds,
  visible,
}: DrawParams) {
  const { x: tx, y: ty, scale } = view;

  context.clearRect(0, 0, width, height);

  const screenX = (i: number) => x[i] * scale + tx;
  const screenY = (i: number) => y[i] * scale + ty;
  const radiusOf = (i: number) => nodeRadius(nodes[i].degree, baseRadius);
  const isShown = (i: number) => visible === null || visible.has(i);

  context.lineWidth = 0.7;
  context.strokeStyle = foreground;
  context.globalAlpha = 0.28 - 0.22 * focusAmount;
  context.beginPath();
  for (const [a, b] of edges) {
    if (!isShown(a) || !isShown(b)) continue;
    context.moveTo(screenX(a), screenY(a));
    context.lineTo(screenX(b), screenY(b));
  }
  context.stroke();

  if (focusAmount > 0.01) {
    context.lineWidth = 1;

    for (let bucket = 0; bucket < BUCKETS; bucket++) {
      context.beginPath();
      let drew = false;

      for (const [a, b] of edges) {
        if (!isShown(a) || !isShown(b)) continue;
        if (bucketOf(Math.min(highlight[a], highlight[b])) !== bucket) continue;
        context.moveTo(screenX(a), screenY(a));
        context.lineTo(screenX(b), screenY(b));
        drew = true;
      }

      if (!drew) continue;
      context.globalAlpha = 0.75 * ((bucket + 1) / BUCKETS) * focusAmount;
      context.stroke();
    }
  }

  // With no focus every value is 1, so the bucket sweep is 24 wasted passes.
  const buckets = focusAmount > 0.001 ? BUCKETS : 1;

  for (const isolated of [true, false]) {
    for (let bucket = 0; bucket < buckets; bucket++) {
      context.beginPath();
      let drew = false;

      for (let i = 0; i < nodes.length; i++) {
        if (!isShown(i)) continue;
        if ((nodes[i].degree === 0) !== isolated) continue;
        if (buckets > 1 && bucketOf(highlight[i]) !== bucket) continue;

        const radius = radiusOf(i);
        context.moveTo(screenX(i) + radius, screenY(i));
        context.arc(screenX(i), screenY(i), radius, 0, Math.PI * 2);
        drew = true;
      }

      if (!drew) continue;
      // Isolated notes render in muted foreground rather than accent.
      const upper = (bucket + 1) / buckets;
      context.globalAlpha = (0.15 + 0.85 * upper) * (isolated ? 0.55 : 1);
      context.fillStyle = isolated ? foreground : accent;
      context.fill();
    }
  }

  if (seeds.length > 0 && focusAmount > 0.01) {
    context.globalAlpha = focusAmount;
    context.lineWidth = 1.5;
    context.strokeStyle = accent;
    context.beginPath();

    for (const seed of seeds) {
      const radius = radiusOf(seed) + 5;
      const px = screenX(seed);
      const py = screenY(seed);
      context.moveTo(px + radius, py);
      context.arc(px, py, radius, 0, Math.PI * 2);
    }
    context.stroke();
  }

  context.font = "11px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillStyle = foreground;

  const relativeScale = scale / Math.max(fitScale, 1e-6);
  for (let i = 0; i < nodes.length; i++) {
    if (!isShown(i)) continue;

    const px = screenX(i);
    const py = screenY(i);
    if (px < -80 || px > width + 80 || py < -20 || py > height + 20) continue;

    const importance = Math.min(nodes[i].degree, 8) / 8;
    const startAt =
      LABEL_SCALE - (LABEL_SCALE - LABEL_HUB_SCALE) * importance * importance;
    const zoomAlpha = Math.min(
      1,
      Math.max(0, (relativeScale - startAt) / LABEL_FADE),
    );
    const alpha = Math.max(labelFocus[i], zoomAlpha * (1 - focusAmount));
    if (alpha < 0.02) continue;

    context.globalAlpha = alpha;
    context.fillText(nodes[i].title, px, py + radiusOf(i) + 3);
  }
}
