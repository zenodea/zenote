"use client";

import { useEffect, useId, useState } from "react";

export function MermaidDiagram({ chart }: { chart: string }) {
  const id = useId();
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        const dark =
          document.documentElement.classList.contains("dark") ||
          window.matchMedia("(prefers-color-scheme: dark)").matches;

        mermaid.initialize({
          startOnLoad: false,
          theme: dark ? "dark" : "default",
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
  }, [chart, id]);

  if (svg === null) {
    return (
      <pre>
        <code>{chart}</code>
      </pre>
    );
  }

  return (
    <div
      className="not-prose my-6 flex justify-center overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
