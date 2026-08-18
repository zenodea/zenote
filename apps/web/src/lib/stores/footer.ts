"use client";

import { useEffect } from "react";
import { createStore } from "../store";

export type FooterClaim = "find" | "vim";

const host = createStore<HTMLElement | null>(null);
const claims = createStore<FooterClaim[]>([]);

export const useFooterHost = host.use;
export const setFooterHost = host.set;

function topOf(held: FooterClaim[]): FooterClaim | null {
  if (held.includes("vim")) return "vim";
  return held[held.length - 1] ?? null;
}

export const useFooterOpen = () => claims.use().length > 0;

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
