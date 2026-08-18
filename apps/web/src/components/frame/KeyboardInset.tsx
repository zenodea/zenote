"use client";

import { useEffect } from "react";

// iOS shrinks only the visual viewport for the soft keyboard; the difference is 0 on Android.
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
