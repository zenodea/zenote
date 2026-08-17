"use client";

import { useEffect } from "react";
import { createStore } from "../store";

export type FooterClaim = "find" | "vim";

const host = createStore<HTMLElement | null>(null);
const claims = createStore<FooterClaim[]>([]);

export const useFooterHost = host.use;
export const setFooterHost = host.set;

// One occupant at a time: vim's prompts are modal, so they outrank the find bar.
function topOf(held: FooterClaim[]): FooterClaim | null {
  if (held.includes("vim")) return "vim";
  return held[held.length - 1] ?? null;
}

/** Open while anything is in it; the bar itself has no opinion about what. */
export const useFooterOpen = () => claims.use().length > 0;

/** Holds the footer up, and reports whether this claim is the one on top. */
export function useFooterClaim(claim: FooterClaim, active: boolean): boolean {
  useEffect(() => {
    if (!active) return;

    claims.set([...claims.get(), claim]);
    return () => {
      const rest = [...claims.get()];
      rest.splice(rest.indexOf(claim), 1);
      claims.set(rest);
    };
  }, [claim, active]);

  return topOf(claims.use()) === claim;
}
