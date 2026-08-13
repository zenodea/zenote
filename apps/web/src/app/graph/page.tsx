import { GraphView } from "@/components/graph/GraphView";
import { PageHeader } from "@/components/frame/PageHeader";
import { buildGraph } from "@/lib/graph/model";
import { getAllNotes } from "@/lib/notes";
import { buildResolver } from "@/lib/wikilinks";

export const metadata = { title: "Graph" };

export default async function GraphPage() {
  const notes = await getAllNotes();
  const graph = buildGraph(notes, buildResolver(notes));

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
