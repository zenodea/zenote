import { solveLayout } from "./force-layout";
import type { Graph } from "./model";

export type Positions = { x: Float64Array; y: Float64Array };

export type Solver = {
  /** The settled positions, or null until the solve has landed. */
  get: () => Positions | null;
  /** Starts the solve. Idempotent, and the same promise every time. */
  prime: () => Promise<void>;
  dispose: () => void;
};

/**
 * The settled layout the camera frames itself on, solved on a worker.
 *
 * It is only ever wanted once, during the wait a loader is already covering,
 * and it is the longest single piece of arithmetic on that path — long enough
 * that solving it here would hold the frame and stop the loader dead.
 */
export function createSolver(
  graph: Graph,
  width: number,
  height: number,
): Solver {
  let solved: Positions | null = null;
  let pending: Promise<void> | null = null;
  let worker: Worker | null = null;

  const solveHere = () => {
    solved ??= solveLayout(graph, width, height);
  };

  const run = () =>
    new Promise<void>((resolve) => {
      try {
        worker = new Worker(new URL("./solve.worker.js", import.meta.url));
      } catch {
        // No worker to be had: better a held frame than no layout.
        solveHere();
        resolve();
        return;
      }

      const finish = (positions?: Positions) => {
        worker?.terminate();
        worker = null;
        if (positions) solved = positions;
        else solveHere();
        resolve();
      };

      worker.onmessage = ({ data }: MessageEvent<Positions>) => finish(data);
      worker.onerror = () => finish();
      worker.postMessage({ graph, width, height });
    });

  return {
    get: () => solved,
    prime: () => (solved ? Promise.resolve() : (pending ??= run())),
    // A disposed run never resolves; clearing it lets a remount start a new one.
    dispose: () => {
      worker?.terminate();
      worker = null;
      if (!solved) pending = null;
    },
  };
}
