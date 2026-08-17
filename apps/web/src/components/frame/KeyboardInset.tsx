"use client";

import { useEffect } from "react";

/**
 * iOS does not resize the layout viewport for the soft keyboard — it only
 * shrinks the visual one — so a fixed shell keeps its bottom bar under the
 * keys. This publishes the difference as `--keyboard` for the shell to give
 * back. Android with `interactiveWidget: resizes-content` already shrinks the
 * layout viewport, so the difference there stays 0 and nothing is paid twice.
 */
export function KeyboardInset() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const root = document.documentElement;

    function update() {
      const inset = Math.max(
        0,
        window.innerHeight - viewport!.height - viewport!.offsetTop,
      );
      root.style.setProperty("--keyboard", `${Math.round(inset)}px`);
    }

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      root.style.removeProperty("--keyboard");
    };
  }, []);

  return null;
}
