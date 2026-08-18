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

export function RouteLoader() {
  const waiting = useRouteWaiting();
  const showing = useLoadingIndicator(waiting);
  useEffect(() => setRouteLoaderShowing(showing), [showing]);

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

export function RouteWait() {
  useRouteWait(true);
  return null;
}
