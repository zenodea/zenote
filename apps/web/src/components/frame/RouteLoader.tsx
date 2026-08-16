"use client";

import { useEffect } from "react";
import { DiamondLoader } from "@/components/ui/DiamondLoader";
import { useLoadingIndicator } from "@/hooks/use-loading-indicator";
import {
  LOADER_FADE_MS,
  setRouteLoaderShowing,
  useRouteLoaderMarked,
  useRouteWait,
  useRouteWaiting,
} from "@/lib/stores/route-loading";

/**
 * The one loader for a page that is still arriving. It lives in the layout,
 * outside the tree the router swaps, so a route fallback handing over to the
 * page it stood in for leaves the arc untouched mid-lap.
 *
 * Inset by the page header's height: the header is up before the wait starts,
 * so the mark centres on the body it is standing in for rather than on the whole pane.
 */
export function RouteLoader() {
  const waiting = useRouteWaiting();
  const showing = useLoadingIndicator(waiting);

  useEffect(() => setRouteLoaderShowing(showing), [showing]);

  // Outlives `showing` by the fade, so the mark dims out with the cover under
  // it instead of being cut away from a background still on its way down.
  const marked = useRouteLoaderMarked();

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 top-14 z-20 grid place-items-center transition-opacity"
      style={{
        opacity: showing ? 1 : 0,
        transitionDuration: showing ? "0ms" : `${LOADER_FADE_MS}ms`,
      }}
      aria-hidden={!showing}
    >
      {marked && <DiamondLoader size={28} />}
    </div>
  );
}

/** Claims the route loader for as long as it is rendered. */
export function RouteWait() {
  useRouteWait(true);
  return null;
}
