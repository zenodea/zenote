"use client";

let fresh: string | null = null;

export function markFreshNote(slug: string) {
  fresh = slug;
}

export function isFreshNote(slug: string): boolean {
  return fresh === slug;
}

export function clearFreshNote(slug: string) {
  if (fresh === slug) fresh = null;
}
