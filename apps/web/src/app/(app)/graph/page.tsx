import { GraphView } from "@/components/graph/GraphView";
import { PageHeader } from "@/components/frame/PageHeader";
import { getGraph } from "@/lib/server/vault-data";

export const metadata = { title: "Graph" };

export default async function GraphPage() {
  const graph = await getGraph();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        title="Graph"
        meta={
          <span>
            {graph.nodes.length} notes · {graph.links.length} links
          </span>
        }
      />
      <div className="min-h-0 flex-1">
        <GraphView graph={graph} />
      </div>
    </div>
  );
}
