"use client";

import { useEffect, useState } from "react";
import { DiamondLoader } from "@/components/ui/DiamondLoader";
import { useLoadingIndicator } from "@/hooks/use-loading-indicator";
import {
  setRouteLoaderShowing,
  useRouteWait,
  useRouteWaiting,
} from "@/lib/stores/route-loading";

const FADE_MS = 200;

/** Lives outside the tree the router swaps, so a fallback handing over leaves the arc mid-lap. */
export function RouteLoader() {
  const waiting = useRouteWaiting();
  const showing = useLoadingIndicator(waiting);
  useEffect(() => setRouteLoaderShowing(showing), [showing]);

  // Mounted a beat longer than it is lit, so the mark dims out rather than being cut away.
  const [marked, setMarked] = useState(false);
  if (showing && !marked) setMarked(true);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 top-14 z-20 grid place-items-center transition-opacity"
      style={{
        opacity: showing ? 1 : 0,
        transitionDuration: showing ? "0ms" : `${FADE_MS}ms`,
      }}
      onTransitionEnd={() => {
        if (!showing) setMarked(false);
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
