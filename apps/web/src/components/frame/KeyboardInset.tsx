"use client";

import { useEffect } from "react";

/* iOS reports the visual viewport late; a short burst around focus changes
   tracks the keyboard as it animates instead of after it lands. */
const BURST_MS = 900;

export function KeyboardInset() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const root = document.documentElement;
    let frame = 0;
    let burst = 0;
    let burstUntil = 0;
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

    function track() {
      measure();
      if (performance.now() < burstUntil) {
        burst = requestAnimationFrame(track);
      }
    }

    function startBurst() {
      burstUntil = performance.now() + BURST_MS;
      cancelAnimationFrame(burst);
      burst = requestAnimationFrame(track);
    }

    measure();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    window.addEventListener("focusin", startBurst);
    window.addEventListener("focusout", startBurst);

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(burst);
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      window.removeEventListener("focusin", startBurst);
      window.removeEventListener("focusout", startBurst);
      root.style.removeProperty("--keyboard");
    };
  }, []);

  return null;
}
