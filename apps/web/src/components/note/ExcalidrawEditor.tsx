"use client";

import { useEffect, useRef, useState } from "react";
import { useLatestRef } from "@/hooks/use-latest-ref";
import "@excalidraw/excalidraw/index.css";
import { useLoadingIndicator } from "@/hooks/use-loading-indicator";
import { parseScene } from "@/lib/drawing";
import {
  interceptNoteLinks,
  noteHref,
  withNoteLinks,
} from "@/lib/drawing-links";
import type {
  ExcalidrawModule,
  ExcalidrawImperativeAPI,
  SceneElements,
} from "@/components/note/excalidraw-types";
import { navigate } from "@/lib/navigation";
import { useThemeId } from "@/lib/use-theme";
import type { WikilinkResolver } from "@/lib/wikilinks";
import { AiDiamond } from "@/components/ai/AiDiamond";
import { DrawingWikilinkSuggest } from "@/components/note/DrawingWikilinkSuggest";
import { useDrawingReveal } from "@/components/note/use-drawing-reveal";

type Loaded = {
  Excalidraw: ExcalidrawModule["Excalidraw"];
  serializeAsJSON: ExcalidrawModule["serializeAsJSON"];
  captureNever: ExcalidrawModule["CaptureUpdateAction"]["NEVER"];
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
  resolver,
  linkTargets,
  onChange,
  autoFocus = true,
}: {
  initialScene: string;
  resolver: WikilinkResolver;
  linkTargets: string[];
  onChange: (scene: string) => void;
  autoFocus?: boolean;
}) {
  const theme = useThemeId();
  const api = useRef<ExcalidrawImperativeAPI | null>(null);
  const resolverRef = useLatestRef(resolver);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [painted, setPainted] = useState(false);
  const revealed = useDrawingReveal(loaded !== null, painted);
  const [suggestHost, setSuggestHost] = useState<HTMLElement | null>(null);
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
      const built = !parsed
        ? []
        : parsed.skeleton
          ? excalidraw.convertToExcalidrawElements(
              parsed.elements as Parameters<
                typeof excalidraw.convertToExcalidrawElements
              >[0],
              { regenerateIds: false },
            )
          : parsed.elements;
      const elements = withNoteLinks(
        built as readonly Record<string, unknown>[],
        resolverRef.current,
      );

      setLoaded({
        Excalidraw: excalidraw.Excalidraw,
        serializeAsJSON: excalidraw.serializeAsJSON,
        captureNever: excalidraw.CaptureUpdateAction.NEVER,
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
  }, [resolverRef]);

  useEffect(() => {
    if (!loaded || !container.current) return;
    setSuggestHost(container.current);
    return interceptNoteLinks(container.current, navigate);
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

  const { Excalidraw, serializeAsJSON, captureNever, initialData } = loaded;
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
        excalidrawAPI={(instance) => {
          api.current = instance;
          setPainted(true);
        }}
        onLinkOpen={(element, event) => {
          const href = noteHref(element.link);
          if (href === null) return;
          event.preventDefault();
          navigate(href);
        }}
        onChange={(elements, appState, files) => {
          if (timer.current) clearTimeout(timer.current);
          settle.current = () => {
            settle.current = null;
            try {
              const linked = withNoteLinks(
                elements as readonly Record<string, unknown>[],
                resolverRef.current,
              );
              if (linked !== elements) {
                api.current?.updateScene({
                  elements: linked as SceneElements,
                  captureUpdate: captureNever,
                });
                return;
              }
              const scene = serializeAsJSON(elements, appState, files, "local");
              if (scene === sceneRef.current) return;
              sceneRef.current = scene;
              onChange(scene);
            } catch {}
          };
          timer.current = setTimeout(() => settle.current?.(), SETTLE_MS);
        }}
      />
      <DrawingWikilinkSuggest host={suggestHost} targets={linkTargets} />
    </div>
  );
}
