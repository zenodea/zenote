import type { GraphNode } from "@/lib/graph";

// Labels start appearing at LABEL_HUB_SCALE (best-connected nodes first) and
// the last stragglers start at LABEL_SCALE; each fades in over LABEL_FADE of
// scale once past its threshold. Below LABEL_HUB_SCALE there is no text.
// Importance is squared, so the widest gap sits between the top tier and the
// next — lesser tiers bunch progressively closer to LABEL_SCALE.
// All three are relative to the fitted zoom, so label timing is independent
// of how large the layout happens to be.
const LABEL_SCALE = 2.0;
const LABEL_HUB_SCALE = 0.8;
const LABEL_FADE = 0.2;
// Continuous per-node alpha would cost one draw call per node; 12 steps is
// indistinguishable in motion and keeps the canvas batched.
const BUCKETS = 12;

export type View = { x: number; y: number; scale: number };

export type DrawParams = {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
  view: View;
  /** Resolved theme tokens (--foreground / --accent); canvas needs concrete
   * colours, so the caller reads them from the active theme. */
  foreground: string;
  accent: string;
  /** Scale at which the whole graph fits the viewport; anchors label zoom. */
  fitScale: number;
  /** Node positions, indexed like `nodes`. */
  x: Float64Array;
  y: Float64Array;
  nodes: GraphNode[];
  edges: ReadonlyArray<readonly [number, number]>;
  baseRadius: number;
  /** Per-node fade toward the active set; rests at 1. */
  highlight: Float32Array;
  /** Per-node label fade; rests at 0. */
  labelFocus: Float32Array;
  /** How far into a focus/hover state the view is, 0..1. */
  focusAmount: number;
  /** Node indices ringed as focus seeds. */
  seeds: number[];
  /** Indices still shown. Null means no filter, which skips every check. */
  visible: Set<number> | null;
};

export function nodeRadius(degree: number, baseRadius: number) {
  return baseRadius * (1 + Math.min(degree, 8) * 0.12);
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

    for (let bucket = 1; bucket <= BUCKETS; bucket++) {
      const lower = (bucket - 1) / BUCKETS;
      const upper = bucket / BUCKETS;
      context.beginPath();
      let drew = false;

      for (const [a, b] of edges) {
        if (!isShown(a) || !isShown(b)) continue;
        const strength = Math.min(highlight[a], highlight[b]);
        // The bottom bucket keeps strength-0 edges (mirroring the node loop
        // below); dropping them would step a notch dimmer once the fade snaps.
        if (strength > upper) continue;
        if (bucket === 1 ? strength < lower : strength <= lower) continue;
        context.moveTo(screenX(a), screenY(a));
        context.lineTo(screenX(b), screenY(b));
        drew = true;
      }

      if (!drew) continue;
      context.globalAlpha = 0.75 * upper * focusAmount;
      context.stroke();
    }
  }

  // With no focus every value is 1, so the bucket sweep is 24 wasted passes.
  const buckets = focusAmount > 0.001 ? BUCKETS : 1;

  for (const isolated of [true, false]) {
    for (let bucket = 0; bucket < buckets; bucket++) {
      const lower = buckets === 1 ? 0 : bucket / buckets;
      const upper = buckets === 1 ? 1 : (bucket + 1) / buckets;
      context.beginPath();
      let drew = false;

      for (let i = 0; i < nodes.length; i++) {
        if (!isShown(i)) continue;
        if ((nodes[i].degree === 0) !== isolated) continue;
        const value = highlight[i];
        if (
          buckets > 1 &&
          (value < lower || (value >= upper && bucket < buckets - 1))
        )
          continue;

        const radius = radiusOf(i);
        context.moveTo(screenX(i) + radius, screenY(i));
        context.arc(screenX(i), screenY(i), radius, 0, Math.PI * 2);
        drew = true;
      }

      if (!drew) continue;
      // Isolated notes render in muted foreground rather than accent.
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
    const importance = Math.min(nodes[i].degree, 8) / 8;
    const startAt =
      LABEL_SCALE - (LABEL_SCALE - LABEL_HUB_SCALE) * importance * importance;
    const zoomAlpha = Math.min(
      1,
      Math.max(0, (relativeScale - startAt) / LABEL_FADE),
    );
    const alpha = Math.max(labelFocus[i], zoomAlpha * (1 - focusAmount));
    if (alpha < 0.02) continue;

    const px = screenX(i);
    const py = screenY(i);
    if (px < -80 || px > width + 80 || py < -20 || py > height + 20) continue;

    context.globalAlpha = alpha;
    context.fillText(nodes[i].title, px, py + radiusOf(i) + 3);
  }
}
