"use client";

import { useEffect, useRef, useState } from "react";
import "@excalidraw/excalidraw/index.css";
import { useLoadingIndicator } from "@/hooks/use-loading-indicator";
import { parseScene } from "@/lib/drawing";
import { useThemeId } from "@/lib/use-theme";
import { AiDiamond } from "@/components/ai/AiDiamond";

type ExcalidrawModule = typeof import("@excalidraw/excalidraw");

type Loaded = {
  Excalidraw: ExcalidrawModule["Excalidraw"];
  serializeAsJSON: ExcalidrawModule["serializeAsJSON"];
  initialData: {
    elements: readonly unknown[];
    appState: Record<string, unknown>;
    files: Record<string, unknown>;
    scrollToContent: boolean;
  } | null;
};

const SETTLE_MS = 500;

export function ExcalidrawEditor({
  initialScene,
  onChange,
  autoFocus = true,
}: {
  initialScene: string;
  onChange: (scene: string) => void;
  autoFocus?: boolean;
}) {
  const theme = useThemeId();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [revealed, setRevealed] = useState(false);
  const slowLoad = useLoadingIndicator(loaded === null);
  const sceneRef = useRef(initialScene);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settle = useRef<(() => void) | null>(null);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const excalidraw = await import("@excalidraw/excalidraw");
      if (!alive) return;

      const parsed = parseScene(sceneRef.current);
      const elements = !parsed
        ? []
        : parsed.skeleton
          ? excalidraw.convertToExcalidrawElements(
              parsed.elements as Parameters<
                typeof excalidraw.convertToExcalidrawElements
              >[0],
              { regenerateIds: false },
            )
          : parsed.elements;

      setLoaded({
        Excalidraw: excalidraw.Excalidraw,
        serializeAsJSON: excalidraw.serializeAsJSON,
        initialData: {
          elements,
          appState: parsed?.appState ?? {},
          files: parsed?.files ?? {},
          scrollToContent: true,
        },
      });
    })();

    return () => {
      alive = false;
      if (timer.current) clearTimeout(timer.current);
      settle.current?.();
    };
  }, []);

  // The canvas paints its own background before the scene lands; reveal after.
  useEffect(() => {
    if (!loaded) return;
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => setRevealed(true)),
    );
    return () => cancelAnimationFrame(frame);
  }, [loaded]);

  // The library sidebar is Excalidraw's DOM; tag it so Junctions can see it.
  useEffect(() => {
    if (!loaded || !container.current) return;

    function tag() {
      const sidebar = container.current?.querySelector<HTMLElement>(
        ".excalidraw .sidebar",
      );
      if (sidebar && sidebar.dataset.seam !== "left") {
        sidebar.dataset.seam = "left";
      }
    }

    tag();
    const observer = new MutationObserver(tag);
    observer.observe(container.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [loaded]);

  if (!loaded) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-background">
        {slowLoad && <AiDiamond size={20} busy />}
      </div>
    );
  }

  const { Excalidraw, serializeAsJSON, initialData } = loaded;
  const dark = theme
    ? theme.endsWith("-dark")
    : window.matchMedia("(prefers-color-scheme: dark)").matches;

  return (
    <div
      ref={container}
      className={`min-h-0 flex-1 bg-background transition-opacity duration-150 ${
        revealed ? "opacity-100" : "opacity-0"
      }`}
    >
      <Excalidraw
        theme={dark ? "dark" : "light"}
        autoFocus={autoFocus}
        initialData={
          initialData as Parameters<typeof Excalidraw>[0]["initialData"]
        }
        onChange={(elements, appState, files) => {
          if (timer.current) clearTimeout(timer.current);
          settle.current = () => {
            settle.current = null;
            try {
              const scene = serializeAsJSON(elements, appState, files, "local");
              if (scene === sceneRef.current) return;
              sceneRef.current = scene;
              onChange(scene);
            } catch {}
          };
          timer.current = setTimeout(() => settle.current?.(), SETTLE_MS);
        }}
      />
    </div>
  );
}
