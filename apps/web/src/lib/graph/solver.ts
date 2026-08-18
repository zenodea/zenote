import { solveLayout } from "./force-layout";
import type { Graph } from "./model";
import type { Positions } from "./geometry";

export type Solver = {
  get: () => Positions | null;
  prime: () => Promise<void>;
  dispose: () => void;
};

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
    dispose: () => {
      worker?.terminate();
      worker = null;
      if (!solved) pending = null;
    },
  };
}
