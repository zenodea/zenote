import { solveLayout } from "./force-layout";

self.onmessage = ({ data }) => {
  const { x, y } = solveLayout(data.graph, data.width, data.height);
  self.postMessage({ x, y }, { transfer: [x.buffer, y.buffer] });
};
