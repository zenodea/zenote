import type { Graph } from "./graph";

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
    linkDistance = 45,
    charge = -500,
    velocityDecay = 0.6,
    centering = 0,
    distanceMax = 120,
  }: LayoutOptions = {},
): Layout {
  const count = graph.nodes.length;

  // distanceMax is what contains the layout. With no long-range repulsion
  // nothing pushes outward forever, so no bounding box is needed.
  const targetRadius = Math.min(width, height) * 0.42;
  const pull = centering;

  const maxSpeed = targetRadius * 0.06;
  const distanceMaxSquared = distanceMax * distanceMax;
  const index = new Map(graph.nodes.map((node, i) => [node.id, i]));

  const x = new Float64Array(count);
  const y = new Float64Array(count);
  const vx = new Float64Array(count);
  const vy = new Float64Array(count);
  const fixed = new Uint8Array(count);

  // Deterministic seeding, not random: the server render and the first client
  // render must agree or React reports a hydration mismatch.
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const radius = 18 * Math.sqrt(0.5 + i);
    const angle = i * goldenAngle;
    x[i] = width / 2 + radius * Math.cos(angle);
    y[i] = height / 2 + radius * Math.sin(angle);
  }

  const edges = graph.links.map(
    (link) => [index.get(link.source)!, index.get(link.target)!] as const,
  );

  const degrees = new Int32Array(count);
  for (const [a, b] of edges) {
    degrees[a]++;
    degrees[b]++;
  }

  const strengths = edges.map(
    ([a, b]) => 1 / Math.max(1, Math.min(degrees[a], degrees[b])),
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
      const push = ((distance - linkDistance) / distance) * alpha * strengths[e];
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
      vx[i] += (width / 2 - x[i]) * pull * alpha;
      vy[i] += (height / 2 - y[i]) * pull * alpha;
    }

    // Recentre by translation, not by force: a centring force strong enough to
    // contain the layout also packs it into a uniform disc and hides structure.
    const shiftX = sumX / Math.max(count, 1) - width / 2;
    const shiftY = sumY / Math.max(count, 1) - height / 2;
    for (let i = 0; i < count; i++) {
      x[i] -= shiftX;
      y[i] -= shiftY;
    }
  }

  function step(): boolean {
    alpha += (alphaTarget - alpha) * ALPHA_DECAY;

    repel();
    springs();
    centre();

    for (let i = 0; i < count; i++) {
      if (fixed[i]) {
        vx[i] = 0;
        vy[i] = 0;
        continue;
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
    x[i] = nextX;
    y[i] = nextY;
    vx[i] = 0;
    vy[i] = 0;
  }

  function unpin(i: number) {
    fixed[i] = 0;
  }

  function reheat(value = 0.3) {
    alpha = Math.max(alpha, value);
  }

  function setAlphaTarget(value: number) {
    alphaTarget = value;
  }

  return { x, y, step, pin, unpin, reheat, setAlphaTarget };
}
