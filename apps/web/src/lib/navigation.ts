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

function internalHref(anchor: Element): string | null {
  if (anchor instanceof HTMLAnchorElement) {
    return anchor.pathname === "/login"
      ? null
      : anchor.pathname + anchor.search;
  }
  const href = anchor.getAttribute("href");
  return href !== null && href.startsWith("/") && href !== "/login"
    ? href
    : null;
}

export function interceptLinkClicks(): () => void {
  const onClick = (event: MouseEvent) => {
    if (!navigatesAway(event)) return;
    const anchor = (event.target as Element).closest("a");
    if (!anchor) return;
    const href = internalHref(anchor);
    if (href === null) return;
    event.preventDefault();
    navigate(href);
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
