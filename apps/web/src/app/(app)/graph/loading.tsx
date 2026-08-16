import { PageHeader } from "@/components/frame/PageHeader";
import { RouteWait } from "@/components/frame/RouteLoader";

// This commits the route the moment the click lands, so the chrome and its seam
// are already there and the wait starts with the click rather than with the
// graph. The mark itself belongs to the layout: GraphView takes the same wait
// over when it mounts, and one loader runs across both.
export default function GraphLoading() {
  return (
    <>
      <PageHeader title="Graph" />
      <div className="min-h-0 flex-1" />
      <RouteWait />
    </>
  );
}
