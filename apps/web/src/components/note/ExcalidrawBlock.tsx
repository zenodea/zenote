"use client";

import { useEffect, useRef, useState } from "react";
import { withNoteLinks } from "@/lib/drawing-links";
import { parseScene } from "@/lib/drawing";
import { useThemeId } from "@/lib/use-theme";
import type { WikilinkResolver } from "@/lib/wikilinks";

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
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const parsed = parseScene(scene);
      if (!parsed) {
        setFailed(true);
        return;
      }
      if (parsed.elements.length === 0) {
        host.current?.replaceChildren();
        return;
      }

      try {
        const { exportToSvg, convertToExcalidrawElements } =
          await import("@excalidraw/excalidraw");

        const built = parsed.skeleton
          ? convertToExcalidrawElements(
              parsed.elements as Parameters<
                typeof convertToExcalidrawElements
              >[0],
              { regenerateIds: false },
            )
          : parsed.elements;

        const elements = withNoteLinks(
          built as readonly Record<string, unknown>[],
          resolver,
        ) as Parameters<typeof exportToSvg>[0]["elements"];

        const dark = theme
          ? theme.endsWith("-dark")
          : window.matchMedia("(prefers-color-scheme: dark)").matches;

        const svg = await exportToSvg({
          elements,
          appState: {
            ...parsed.appState,
            exportBackground: false,
            exportWithDarkMode: dark,
          },
          files: parsed.files as Parameters<typeof exportToSvg>[0]["files"],
        });

        if (cancelled || !host.current) return;
        svg.style.maxWidth = "100%";
        svg.style.maxHeight = fill ? "80dvh" : "70dvh";
        svg.style.width = fill ? "100%" : "auto";
        svg.style.height = "auto";
        host.current.replaceChildren(svg);
        setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scene, theme, fill, resolver]);

  if (failed) {
    return (
      <pre>
        <code>{scene}</code>
      </pre>
    );
  }

  return (
    <div
      ref={host}
      className={`not-prose flex w-full justify-center ${fill ? "" : "my-6"}`}
    />
  );
}
