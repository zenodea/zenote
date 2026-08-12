import { GraphView } from "@/components/graph-view";
import { buildGraph } from "@/lib/graph";
import { getAllNotes } from "@/lib/notes";
import { buildResolver } from "@/lib/wikilinks";

export const metadata = { title: "Graph" };

export default async function GraphPage() {
  const notes = await getAllNotes();
  const graph = buildGraph(notes, buildResolver(notes));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center border-b border-foreground/15 px-6">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Graph</h1>
          <p className="text-sm opacity-60">
            {graph.nodes.length} notes · {graph.links.length} links
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <GraphView graph={graph} />
      </div>
    </div>
  );
}
