"use client";

import { navigatesAway } from "./page-fade";

export function navigate(href: string): void {
  if (href === window.location.pathname + window.location.search) return;
  window.history.pushState(null, "", href);
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
