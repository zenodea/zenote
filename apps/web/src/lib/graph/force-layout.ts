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
const MIN_DISTANCE = 1;
const MIN_DISTANCE_SQUARED = MIN_DISTANCE * MIN_DISTANCE;
const THETA_SQUARED = 0.81;
const MAX_QUAD_DEPTH = 32;

export function createLayout(
  graph: Graph,
  width: number,
  height: number,
  {
    linkDistance = 100,
    charge = -500,
    velocityDecay = 0.5,
    // Settles at one link length of spacing per node, independent of count.
    centering = (4 * -charge) / (linkDistance * linkDistance),
    distanceMax = Infinity,
  }: LayoutOptions = {},
): Layout {
  const count = graph.nodes.length;

  const spacing =
    centering > 0 && charge < 0 ? Math.sqrt(-charge / centering) : linkDistance;
  const originX = width / 2;
  const originY = height / 2;

  const maxSpeed = linkDistance * 0.2;
  const distanceMaxSquared = distanceMax * distanceMax;
  const focusRadiusSquared = (linkDistance * 2.5) ** 2;
  let focused = -1;

  const x = new Float64Array(count);
  const y = new Float64Array(count);
  const vx = new Float64Array(count);
  const vy = new Float64Array(count);
  const fixed = new Uint8Array(count);

  // Seeded at the density the forces settle at, so the first frames relax rather than blast outward.
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const radius = spacing * Math.sqrt(0.5 + i);
    const angle = i * goldenAngle;
    x[i] = originX + radius * Math.cos(angle);
    y[i] = originY + radius * Math.sin(angle);
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

  // Rescaled to MIN_DISTANCE: same direction, but a coincident pair cannot kick unboundedly.
  const scratch = new Float64Array(3);
  function softenOffset(i: number, dx: number, dy: number, squared: number) {
    if (squared > 0) {
      const scale = Math.sqrt(MIN_DISTANCE_SQUARED / squared);
      scratch[0] = dx * scale;
      scratch[1] = dy * scale;
    } else {
      const angle = i * goldenAngle;
      scratch[0] = Math.cos(angle) * MIN_DISTANCE;
      scratch[1] = Math.sin(angle) * MIN_DISTANCE;
    }
    scratch[2] = MIN_DISTANCE_SQUARED;
  }

  // Flat-array quadtree: a child slot is -1 (empty), -(point + 2), or a cell; coincident points chain.
  let cellCapacity = 512;
  let child = new Int32Array(cellCapacity * 4);
  let cellX = new Float64Array(cellCapacity);
  let cellY = new Float64Array(cellCapacity);
  let cellHalf = new Float64Array(cellCapacity);
  let comX = new Float64Array(cellCapacity);
  let comY = new Float64Array(cellCapacity);
  let mass = new Float64Array(cellCapacity);
  let stack = new Int32Array(cellCapacity);
  const nextPoint = new Int32Array(count);
  let cellCount = 0;

  function growCells() {
    cellCapacity *= 2;
    const grownChild = new Int32Array(cellCapacity * 4);
    grownChild.set(child);
    child = grownChild;
    const grow = (old: Float64Array) => {
      const next = new Float64Array(cellCapacity);
      next.set(old);
      return next;
    };
    cellX = grow(cellX);
    cellY = grow(cellY);
    cellHalf = grow(cellHalf);
    comX = grow(comX);
    comY = grow(comY);
    mass = grow(mass);
    stack = new Int32Array(cellCapacity);
  }

  function allocCell(cx: number, cy: number, half: number): number {
    if (cellCount === cellCapacity) growCells();
    const c = cellCount++;
    child.fill(-1, c * 4, c * 4 + 4);
    cellX[c] = cx;
    cellY[c] = cy;
    cellHalf[c] = half;
    return c;
  }

  function insert(i: number) {
    let c = 0;
    let depth = 0;
    for (;;) {
      const q = (x[i] > cellX[c] ? 1 : 0) | (y[i] > cellY[c] ? 2 : 0);
      const slot = c * 4 + q;
      const v = child[slot];

      if (v === -1) {
        child[slot] = -(i + 2);
        return;
      }
      if (v <= -2) {
        const p = -v - 2;
        if (depth >= MAX_QUAD_DEPTH || (x[p] === x[i] && y[p] === y[i])) {
          nextPoint[i] = p;
          child[slot] = -(i + 2);
          return;
        }
        const half = cellHalf[c] / 2;
        const sub = allocCell(
          cellX[c] + (q & 1 ? half : -half),
          cellY[c] + (q & 2 ? half : -half),
          half,
        );
        child[slot] = sub;
        const pq = (x[p] > cellX[sub] ? 1 : 0) | (y[p] > cellY[sub] ? 2 : 0);
        child[sub * 4 + pq] = -(p + 2);
        c = sub;
        depth++;
        continue;
      }
      c = v;
      depth++;
    }
  }

  // Children always index after their parent, so a reverse sweep aggregates bottom-up.
  function accumulate() {
    for (let c = cellCount - 1; c >= 0; c--) {
      let m = 0;
      let sx = 0;
      let sy = 0;
      for (let s = c * 4; s < c * 4 + 4; s++) {
        const v = child[s];
        if (v === -1) continue;
        if (v <= -2) {
          for (let p = -v - 2; p >= 0; p = nextPoint[p]) {
            m += 1;
            sx += x[p];
            sy += y[p];
          }
        } else {
          m += mass[v];
          sx += comX[v] * mass[v];
          sy += comY[v] * mass[v];
        }
      }
      mass[c] = m;
      comX[c] = m ? sx / m : cellX[c];
      comY[c] = m ? sy / m : cellY[c];
    }
  }

  function repel() {
    if (count < 2) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < count; i++) {
      if (x[i] < minX) minX = x[i];
      if (x[i] > maxX) maxX = x[i];
      if (y[i] < minY) minY = y[i];
      if (y[i] > maxY) maxY = y[i];
    }

    cellCount = 0;
    nextPoint.fill(-1);
    allocCell(
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      Math.max(maxX - minX, maxY - minY) / 2 + 1e-6,
    );
    for (let i = 0; i < count; i++) insert(i);
    accumulate();

    const k = charge * alpha;
    for (let i = 0; i < count; i++) {
      let top = 0;
      stack[top++] = 0;
      while (top > 0) {
        const c = stack[--top];
        if (mass[c] === 0) continue;
        let dx = comX[c] - x[i];
        let dy = comY[c] - y[i];
        let squared = dx * dx + dy * dy;
        const size = cellHalf[c] * 2;

        if (size * size < THETA_SQUARED * squared) {
          if (squared > distanceMaxSquared) continue;
          if (squared < MIN_DISTANCE_SQUARED) {
            softenOffset(i, dx, dy, squared);
            dx = scratch[0];
            dy = scratch[1];
            squared = scratch[2];
          }
          const w = (k * mass[c]) / squared;
          vx[i] += dx * w;
          vy[i] += dy * w;
          continue;
        }

        for (let s = c * 4; s < c * 4 + 4; s++) {
          const v = child[s];
          if (v === -1) continue;
          if (v <= -2) {
            for (let p = -v - 2; p >= 0; p = nextPoint[p]) {
              if (p === i) continue;
              let pdx = x[p] - x[i];
              let pdy = y[p] - y[i];
              let d2 = pdx * pdx + pdy * pdy;
              if (d2 > distanceMaxSquared) continue;
              if (d2 < MIN_DISTANCE_SQUARED) {
                // Seeded on i, not the pair: coincident nodes must scatter in different directions.
                softenOffset(i, pdx, pdy, d2);
                pdx = scratch[0];
                pdy = scratch[1];
                d2 = scratch[2];
              }
              const w = k / d2;
              vx[i] += pdx * w;
              vy[i] += pdy * w;
            }
          } else {
            stack[top++] = v;
          }
        }
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

      // Rest length: without it a connected graph collapses into a knot.
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

  // A fixed origin, not the running centroid: a centroid drags the cloud along with the dragged node.
  function centre() {
    for (let i = 0; i < count; i++) {
      vx[i] += (originX - x[i]) * centering * alpha;
      vy[i] += (originY - y[i]) * centering * alpha;
    }
  }

  function step(): boolean {
    // pin, unpin, reheat and setAlphaTarget all raise alpha, so nothing has to track un-settling.
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
