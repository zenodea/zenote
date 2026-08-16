import { PageHeader } from "@/components/frame/PageHeader";
import { RouteWait } from "@/components/frame/RouteLoader";

// Commits the route on the click; the mark belongs to the layout, and GraphView takes the same wait over.
export default function GraphLoading() {
  return (
    <>
      <PageHeader title="Graph" />
      <div className="min-h-0 flex-1" />
      <RouteWait />
    </>
  );
}
