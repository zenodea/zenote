"use client";

import { beginPageFade, navigatesAway } from "./page-fade";

const FADE_OUT_MS = 110;

export function navigate(href: string): void {
  if (href === window.location.pathname + window.location.search) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.history.pushState(null, "", href);
    return;
  }
  beginPageFade();
  setTimeout(() => window.history.pushState(null, "", href), FADE_OUT_MS);
}

export function interceptLinkClicks(): () => void {
  const onClick = (event: MouseEvent) => {
    if (!navigatesAway(event)) return;
    const anchor = (event.target as Element).closest("a");
    if (!anchor || anchor.pathname === "/login") return;
    event.preventDefault();
    navigate(anchor.pathname + anchor.search);
  };

  document.addEventListener("click", onClick, true);
  return () => document.removeEventListener("click", onClick, true);
}

export function decodeSlug(encoded: string): string {
  try {
    return encoded.split("/").map(decodeURIComponent).join("/");
  } catch {
    return encoded;
  }
}
