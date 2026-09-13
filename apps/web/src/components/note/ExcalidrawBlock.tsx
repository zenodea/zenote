"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "@excalidraw/excalidraw/index.css";
import { parseScene, sceneTextLines } from "@/lib/drawing";
import {
  interceptNoteLinks,
  linkedSlugs,
  noteHref,
  withDisplayText,
  withNoteLinks,
} from "@/lib/drawing-links";
import { DrawingLinks } from "@/components/note/DrawingLinks";
import { useDrawingReveal } from "@/components/note/use-drawing-reveal";
import { useVault } from "@/lib/vault/store";
import { navigate } from "@/lib/navigation";
import { useThemeId } from "@/lib/use-theme";
import type { WikilinkResolver } from "@/lib/wikilinks";
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawModule,
} from "@/components/note/excalidraw-types";

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
  const { notes } = useVault();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [painted, setPainted] = useState(false);
  const revealed = useDrawingReveal(loaded !== null, painted);
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<ExcalidrawImperativeAPI | null>(null);
  const refit = useRef<(() => void) | null>(null);

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
            elements: withDisplayText(
              withNoteLinks(
                built as readonly Record<string, unknown>[],
                resolver,
              ),
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

  useEffect(() => {
    const node = host.current;
    if (!loaded || !node) return;

    let frame = 0;
    let fitted = "";

    const fit = () => {
      const instance = api.current;
      if (!instance) return;

      const { width, height } = node.getBoundingClientRect();
      if (width < 1 || height < 1) return;

      const size = `${Math.round(width)}x${Math.round(height)}`;
      if (size === fitted) return;

      const elements = instance.getSceneElements();
      if (elements.length === 0) return;

      fitted = size;
      instance.scrollToContent(elements, {
        fitToContent: true,
        animate: false,
      });
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };

    refit.current = schedule;
    const observer = new ResizeObserver(schedule);
    observer.observe(node);

    return () => {
      refit.current = null;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [loaded]);

  const linked = useMemo(() => {
    const titles = new Map(notes.map((note) => [note.slug, note.title]));
    return linkedSlugs(sceneTextLines(scene).join("\n"), resolver).flatMap(
      (slug) => {
        const title = titles.get(slug);
        return title === undefined ? [] : [{ slug, title }];
      },
    );
  }, [notes, scene, resolver]);

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
      className={`not-prose relative w-full overflow-hidden rounded bg-background ${
        fill ? "drawing-pane" : "my-6 h-[60dvh] border border-foreground/15"
      }`}
    >
      {Excalidraw && initialData && (
        <div
          className={`h-full w-full transition-opacity duration-150 ${
            revealed ? "opacity-100" : "opacity-0"
          }`}
        >
          <Excalidraw
            viewModeEnabled
            theme={dark ? "dark" : "light"}
            initialData={
              initialData as Parameters<typeof Excalidraw>[0]["initialData"]
            }
            excalidrawAPI={(instance) => {
              api.current = instance;
              refit.current?.();
              setPainted(true);
            }}
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
        </div>
      )}
      {revealed && <DrawingLinks notes={linked} />}
    </div>
  );
}
