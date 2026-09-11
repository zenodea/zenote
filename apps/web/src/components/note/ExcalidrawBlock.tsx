"use client";

import { useEffect, useRef, useState } from "react";
import "@excalidraw/excalidraw/index.css";
import { parseScene } from "@/lib/drawing";
import {
  interceptNoteLinks,
  noteHref,
  withNoteLinks,
} from "@/lib/drawing-links";
import { navigate } from "@/lib/navigation";
import { useThemeId } from "@/lib/use-theme";
import type { WikilinkResolver } from "@/lib/wikilinks";
import type { ExcalidrawModule } from "@/components/note/excalidraw-types";

type Loaded = {
  Excalidraw: ExcalidrawModule["Excalidraw"];
  initialData: {
    elements: readonly unknown[];
    appState: Record<string, unknown>;
    files: Record<string, unknown>;
    scrollToContent: boolean;
  };
};

export function ExcalidrawBlock({
  scene,
  resolver,
  fill = false,
}: {
  scene: string;
  resolver: WikilinkResolver;
  fill?: boolean;
}) {
  const theme = useThemeId();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const parsed = parseScene(scene);
      if (!parsed) {
        setFailed(true);
        return;
      }

      try {
        const excalidraw = await import("@excalidraw/excalidraw");
        if (!alive) return;

        const built = parsed.skeleton
          ? excalidraw.convertToExcalidrawElements(
              parsed.elements as Parameters<
                typeof excalidraw.convertToExcalidrawElements
              >[0],
              { regenerateIds: false },
            )
          : parsed.elements;

        setLoaded({
          Excalidraw: excalidraw.Excalidraw,
          initialData: {
            elements: withNoteLinks(
              built as readonly Record<string, unknown>[],
              resolver,
            ),
            appState: parsed.appState,
            files: parsed.files,
            scrollToContent: true,
          },
        });
        setFailed(false);
      } catch {
        if (alive) setFailed(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [scene, resolver]);

  useEffect(() => {
    if (!loaded || !host.current) return;
    return interceptNoteLinks(host.current, navigate);
  }, [loaded]);

  if (failed) {
    return (
      <pre>
        <code>{scene}</code>
      </pre>
    );
  }

  const { Excalidraw, initialData } = loaded ?? {};
  const dark = theme
    ? theme.endsWith("-dark")
    : typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

  return (
    <div
      ref={host}
      className={`not-prose w-full overflow-hidden rounded ${
        fill ? "drawing-pane" : "my-6 h-[60dvh] border border-foreground/15"
      }`}
    >
      {Excalidraw && initialData && (
        <Excalidraw
          viewModeEnabled
          theme={dark ? "dark" : "light"}
          initialData={
            initialData as Parameters<typeof Excalidraw>[0]["initialData"]
          }
          UIOptions={{
            canvasActions: {
              export: false,
              saveToActiveFile: false,
              loadScene: false,
              toggleTheme: false,
            },
          }}
          onLinkOpen={(element, event) => {
            const href = noteHref(element.link);
            if (href === null) return;
            event.preventDefault();
            navigate(href);
          }}
        />
      )}
    </div>
  );
}
