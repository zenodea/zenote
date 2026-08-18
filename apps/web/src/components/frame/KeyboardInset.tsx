"use client";

import { useEffect } from "react";

export function KeyboardInset() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const root = document.documentElement;
    let frame = 0;
    let written = -1;

    function measure() {
      const inset = Math.round(
        Math.max(0, window.innerHeight - viewport!.height - viewport!.offsetTop),
      );
      if (Math.abs(inset - written) < 2) return;
      written = inset;
      root.style.setProperty("--keyboard", `${inset}px`);
    }

    function update() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    }

    measure();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);

    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      root.style.removeProperty("--keyboard");
    };
  }, []);

  return null;
}
