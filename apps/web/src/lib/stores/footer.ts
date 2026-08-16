"use client";

import { useEffect } from "react";
import { createStore } from "../store";

const host = createStore<HTMLElement | null>(null);
const claims = createStore(0);

export const useFooterHost = host.use;
export const setFooterHost = host.set;

/** Open while anything is in it; the bar itself has no opinion about what. */
export const useFooterOpen = () => claims.use() > 0;

/** Holds the footer up for as long as this component wants to be down there. */
export function useFooterClaim(active: boolean) {
  useEffect(() => {
    if (!active) return;

    claims.set(claims.get() + 1);
    return () => claims.set(claims.get() - 1);
  }, [active]);
}
