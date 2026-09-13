"use client";

import { useEffect } from "react";

export function Fullscreen() {
  useEffect(() => {
    const root = document.documentElement;
    if (!root.requestFullscreen) return;

    const standalone = window.matchMedia("(display-mode: standalone)");
    if (!standalone.matches) return;

    let asked = false;

    function ask() {
      if (asked) return;
      asked = true;
      stop();
      if (document.fullscreenElement) return;
      void root.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
    }

    function stop() {
      window.removeEventListener("pointerdown", ask);
      window.removeEventListener("keydown", ask);
    }

    window.addEventListener("pointerdown", ask);
    window.addEventListener("keydown", ask);
    return stop;
  }, []);

  return null;
}
