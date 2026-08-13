import { indexGraph, type Graph } from "./model";

export type Layout = {
  x: Float64Array;
  y: Float64Array;
  step: () => boolean;
  pin: (i: number, x: number, y: number) => void;
  unpin: (i: number) => void;
  reheat: (alpha?: number) => void;
  setAlphaTarget: (value: number) => void;
};

export type LayoutOptions = {
  linkDistance?: number;
  charge?: number;
  velocityDecay?: number;
  centering?: number;
  distanceMax?: number;
};

const ALPHA_MIN = 0.001;
const ALPHA_DECAY = 1 - Math.pow(ALPHA_MIN, 1 / 300);
const MIN_DISTANCE_SQUARED = 1;

export function createLayout(
  graph: Graph,
  width: number,
  height: number,
  {
    linkDistance = 100,
    charge = -500,
    velocityDecay = 0.5,
    centering = 0.02,
    distanceMax = Infinity,
  }: LayoutOptions = {},
): Layout {
  const count = graph.nodes.length;

  const targetRadius = Math.min(width, height) * 0.42;

  const maxSpeed = targetRadius * 0.06;
  const distanceMaxSquared = distanceMax * distanceMax;
  const focusRadiusSquared = (linkDistance * 2.5) ** 2;
  let focused = -1;

  const x = new Float64Array(count);
  const y = new Float64Array(count);
  const vx = new Float64Array(count);
  const vy = new Float64Array(count);
  const fixed = new Uint8Array(count);

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const radius = 18 * Math.sqrt(0.5 + i);
    const angle = i * goldenAngle;
    x[i] = width / 2 + radius * Math.cos(angle);
    y[i] = height / 2 + radius * Math.sin(angle);
  }

  const { edges, neighbours } = indexGraph(graph);
  const degrees = neighbours.map((list) => list.length);
  const focusFloor = new Float32Array(count);

  const strengths = edges.map(
    ([a, b]) => 0.5 / Math.max(1, Math.min(degrees[a], degrees[b])),
  );
  const biases = edges.map(
    ([a, b]) => degrees[a] / Math.max(1, degrees[a] + degrees[b]),
  );

  let alpha = 1;
  let alphaTarget = 0;

  function jiggle(i: number): number {
    return ((i % 11) - 5) * 1e-6 || 1e-6;
  }

  function repel() {
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        let dx = x[j] - x[i];
        let dy = y[j] - y[i];
        let squared = dx * dx + dy * dy;

        if (squared > distanceMaxSquared) continue;

        if (squared < MIN_DISTANCE_SQUARED) {
          dx = jiggle(i);
          dy = jiggle(j);
          squared = dx * dx + dy * dy;
        }

        const w = (charge * alpha) / squared;
        vx[i] += dx * w;
        vy[i] += dy * w;
        vx[j] -= dx * w;
        vy[j] -= dy * w;
      }
    }
  }

  function springs() {
    for (let e = 0; e < edges.length; e++) {
      const [a, b] = edges[e];

      let dx = x[b] + vx[b] - x[a] - vx[a];
      let dy = y[b] + vy[b] - y[a] - vy[a];
      let distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 1e-6) {
        dx = jiggle(a);
        dy = jiggle(b);
        distance = Math.sqrt(dx * dx + dy * dy);
      }

      // Rest length: pushes apart below linkDistance, pulls above it. Without
      // it a connected graph collapses into a knot.
      const push =
        ((distance - linkDistance) / distance) * alpha * strengths[e];
      dx *= push;
      dy *= push;

      vx[b] -= dx * biases[e];
      vy[b] -= dy * biases[e];
      vx[a] += dx * (1 - biases[e]);
      vy[a] += dy * (1 - biases[e]);
    }
  }

  function centre() {
    let sumX = 0;
    let sumY = 0;
    for (let i = 0; i < count; i++) {
      sumX += x[i];
      sumY += y[i];
    }
    const cx = sumX / Math.max(count, 1);
    const cy = sumY / Math.max(count, 1);
    for (let i = 0; i < count; i++) {
      vx[i] += (cx - x[i]) * centering * alpha;
      vy[i] += (cy - y[i]) * centering * alpha;
    }
  }

  function step(): boolean {
    // Settled and nothing keeping it warm: skip the pass entirely. pin,
    // unpin, reheat and setAlphaTarget all raise alpha (or the target), so
    // any of them un-settles the simulation without callers tracking it.
    if (alpha <= ALPHA_MIN && alphaTarget <= 0) return false;

    alpha += (alphaTarget - alpha) * ALPHA_DECAY;
    if (focused >= 0 && !fixed[focused] && alpha < 0.005) focused = -1;

    repel();
    springs();
    centre();

    for (let i = 0; i < count; i++) {
      if (fixed[i]) {
        vx[i] = 0;
        vy[i] = 0;
        continue;
      }
      if (focused >= 0) {
        const dx = x[i] - x[focused];
        const dy = y[i] - y[focused];
        const ratio = (dx * dx + dy * dy) / focusRadiusSquared;
        const falloff = Math.max(focusFloor[i], 1 / (1 + ratio));
        vx[i] *= falloff;
        vy[i] *= falloff;
      }
      vx[i] *= velocityDecay;
      vy[i] *= velocityDecay;

      const speed = Math.hypot(vx[i], vy[i]);
      if (speed > maxSpeed) {
        vx[i] = (vx[i] / speed) * maxSpeed;
        vy[i] = (vy[i] / speed) * maxSpeed;
      }

      x[i] += vx[i];
      y[i] += vy[i];
    }

    return alpha > ALPHA_MIN || alphaTarget > 0;
  }

  function pin(i: number, nextX: number, nextY: number) {
    fixed[i] = 1;
    if (focused !== i) {
      focused = i;
      focusFloor.fill(0);
      for (const j of neighbours[i]) {
        focusFloor[j] = 1;
        for (const k of neighbours[j]) {
          if (k !== i && focusFloor[k] < 0.4) focusFloor[k] = 0.4;
        }
      }
    }
    x[i] = nextX;
    y[i] = nextY;
    vx[i] = 0;
    vy[i] = 0;
  }

  function unpin(i: number) {
    fixed[i] = 0;
    alpha = Math.min(alpha, 0.03);
  }

  function reheat(value = 0.3) {
    alpha = Math.max(alpha, value);
  }

  function setAlphaTarget(value: number) {
    alphaTarget = value;
  }

  return { x, y, step, pin, unpin, reheat, setAlphaTarget };
}

/** Runs a fresh simulation to rest and returns the settled positions. */
export function solveLayout(
  graph: Graph,
  width: number,
  height: number,
  options?: LayoutOptions,
): { x: Float64Array; y: Float64Array } {
  const layout = createLayout(graph, width, height, options);
  let guard = 0;
  while (layout.step() && guard++ < 1000) {}
  return { x: layout.x, y: layout.y };
}
