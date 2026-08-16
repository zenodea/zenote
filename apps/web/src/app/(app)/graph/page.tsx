import { GraphMeta } from "@/components/graph/GraphMeta";
import { GraphView } from "@/components/graph/GraphView";
import { PageHeader } from "@/components/frame/PageHeader";
import { getGraph } from "@/lib/server/vault-data";

export const metadata = { title: "Graph" };

export default async function GraphPage() {
  const graph = await getGraph();

  // A fragment, not a wrapper: the header must stay a direct child of PageFade for its seam.
  return (
    <>
      <PageHeader
        title="Graph"
        meta={
          <GraphMeta nodes={graph.nodes.length} links={graph.links.length} />
        }
      />
      <div className="min-h-0 flex-1 overflow-hidden">
        <GraphView graph={graph} standalone />
      </div>
    </>
  );
}
