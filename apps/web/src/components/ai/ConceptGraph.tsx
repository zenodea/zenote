"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

export type ConceptGraphData = {
  nodes: { label: string; slug: string | null }[];
  edges: { from: string; to: string; label?: string }[];
};

const WIDTH = 320;
const PAD = 34;
const ROUNDS = 260;

/** Deterministic, so a stored map redraws exactly as it was first seen. */
function layout(data: ConceptGraphData) {
  const count = data.nodes.length;
  const points = data.nodes.map((_, i) => {
    const angle = (2 * Math.PI * i) / count;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  });

  const index = new Map(
    data.nodes.map((node, i) => [node.label.toLowerCase(), i]),
  );
  const links: { a: number; b: number; label?: string }[] = [];
  for (const edge of data.edges) {
    const a = index.get(edge.from.toLowerCase());
    const b = index.get(edge.to.toLowerCase());
    if (a === undefined || b === undefined || a === b) continue;
    links.push({ a, b, label: edge.label });
  }

  for (let round = 0; round < ROUNDS; round++) {
    const heat = 0.05 * (1 - round / ROUNDS);

    for (let a = 0; a < count; a++) {
      for (let b = a + 1; b < count; b++) {
        const dx = points[b].x - points[a].x;
        const dy = points[b].y - points[a].y;
        const gap = Math.max(0.05, Math.hypot(dx, dy));
        const push = (0.12 / (gap * gap)) * heat;
        points[a].x -= (dx / gap) * push;
        points[a].y -= (dy / gap) * push;
        points[b].x += (dx / gap) * push;
        points[b].y += (dy / gap) * push;
      }
    }

    for (const { a, b } of links) {
      const dx = points[b].x - points[a].x;
      const dy = points[b].y - points[a].y;
      const gap = Math.max(0.05, Math.hypot(dx, dy));
      const pull = (gap - 0.9) * 0.6 * heat;
      points[a].x += (dx / gap) * pull;
      points[a].y += (dy / gap) * pull;
      points[b].x -= (dx / gap) * pull;
      points[b].y -= (dy / gap) * pull;
    }

    for (const point of points) {
      point.x -= point.x * 0.03 * heat;
      point.y -= point.y * 0.03 * heat;
    }
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const spanX = Math.max(0.01, Math.max(...xs) - Math.min(...xs));
  const spanY = Math.max(0.01, Math.max(...ys) - Math.min(...ys));
  const height = Math.max(170, Math.min(300, 130 + 26 * count));

  return {
    height,
    links,
    points: points.map((p) => ({
      x: PAD + ((p.x - Math.min(...xs)) / spanX) * (WIDTH - PAD * 2),
      y: PAD + ((p.y - Math.min(...ys)) / spanY) * (height - PAD * 2),
    })),
  };
}

function clip(label: string): string {
  return label.length <= 22 ? label : `${label.slice(0, 21)}…`;
}

/** A little map of ideas, drawn by the assistant, living inside the thread. */
export function ConceptGraph({ data }: { data: ConceptGraphData }) {
  const router = useRouter();
  const { points, links, height } = useMemo(() => layout(data), [data]);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="not-prose block w-full border border-foreground/15"
      role="img"
      aria-label="Concept map"
    >
      {links.map(({ a, b, label }, i) => {
        const midX = (points[a].x + points[b].x) / 2;
        const midY = (points[a].y + points[b].y) / 2;
        return (
          <g key={`${a}:${b}:${i}`}>
            <line
              x1={points[a].x}
              y1={points[a].y}
              x2={points[b].x}
              y2={points[b].y}
              stroke="currentColor"
              strokeOpacity={0.25}
            />
            {label && (
              <text
                x={midX}
                y={midY - 3}
                textAnchor="middle"
                fontSize={8}
                fill="currentColor"
                opacity={0.55}
              >
                {clip(label)}
              </text>
            )}
          </g>
        );
      })}

      {data.nodes.map((node, i) => {
        const { x, y } = points[i];
        const note = node.slug !== null;
        return (
          <g
            key={node.label}
            onClick={note ? () => router.push(`/notes/${node.slug}`) : undefined}
            className={note ? "cursor-pointer" : undefined}
          >
            {note ? (
              <path
                d={`M ${x} ${y - 4.5} L ${x + 4.5} ${y} L ${x} ${y + 4.5} L ${x - 4.5} ${y} Z`}
                fill="var(--background)"
                stroke="var(--accent)"
                strokeWidth={1.2}
              />
            ) : (
              <circle
                cx={x}
                cy={y}
                r={3}
                fill="var(--background)"
                stroke="currentColor"
                strokeOpacity={0.6}
              />
            )}
            <text
              x={x}
              y={y + 15}
              textAnchor="middle"
              fontSize={10}
              fill={note ? "var(--accent)" : "currentColor"}
              opacity={note ? 1 : 0.8}
            >
              {clip(node.label)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
