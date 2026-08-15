"use client";

import { useEffect, useId, useState } from "react";
import { useThemeId } from "@/lib/use-theme";
import { Scroller } from "@/components/ui/Scroller";



/* Mermaid needs concrete colours, so approximate CSS color-mix in JS. */
function mix(top: string, bottom: string, weight: number): string {
  const pair = [top, bottom].map((hex) =>
    /^#[0-9a-f]{6}$/i.test(hex)
      ? [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
      : null,
  );
  if (!pair[0] || !pair[1]) return top;
  return `#${pair[0]
    .map((channel, i) =>
      Math.round(channel * weight + pair[1]![i] * (1 - weight))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

export function MermaidDiagram({ chart }: { chart: string }) {
  const id = useId();
  // Diagrams re-render when the active theme changes.
  const theme = useThemeId();
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        const dark = theme
          ? theme.endsWith("-dark")
          : window.matchMedia("(prefers-color-scheme: dark)").matches;

        const tokens = getComputedStyle(document.documentElement);
        const background = tokens.getPropertyValue("--background").trim();
        const foreground = tokens.getPropertyValue("--foreground").trim();
        const accent = tokens.getPropertyValue("--accent").trim();

        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          themeVariables: {
            darkMode: dark,
            background,
            fontFamily: getComputedStyle(document.body).fontFamily,
            primaryColor: mix(accent, background, 0.2),
            primaryTextColor: foreground,
            primaryBorderColor: accent,
            secondaryColor: mix(accent, background, 0.1),
            tertiaryColor: mix(foreground, background, 0.05),
            lineColor: mix(foreground, background, 0.65),
            noteBkgColor: mix(accent, background, 0.15),
            noteTextColor: foreground,
            noteBorderColor: mix(accent, background, 0.5),
          },
        });

        const rendered = await mermaid.render(
          `mermaid-${id.replace(/[^a-zA-Z0-9]/g, "")}`,
          chart,
        );
        if (!cancelled) setSvg(rendered.svg);
      } catch {
        // Invalid diagram source: keep showing the raw code block.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart, id, theme]);

  if (svg === null) {
    return (
      <pre>
        <code>{chart}</code>
      </pre>
    );
  }

  return (
    <Scroller axis="x" className="not-prose my-6">
      <div
        className="flex w-max min-w-full justify-center"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </Scroller>
  );
}
