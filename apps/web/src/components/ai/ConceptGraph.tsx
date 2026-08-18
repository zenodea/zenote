"use client";

import { useEffect, useMemo, useRef } from "react";
import { createLayout } from "@/lib/graph/force-layout";
import { baseRadiusFor, nodeRadius } from "@/lib/graph/geometry";
import type { Graph } from "@/lib/graph/model";
import { navigate } from "@/lib/navigation";

export type ConceptGraphData = {
  nodes: { label: string; slug: string | null }[];
  edges: { from: string; to: string; label?: string }[];
};

const WIDTH = 320;
const PAD = 30;
const EDGE_ALPHA = 0.28;
const DRAG_ALPHA = 0.1;
const CLICK_SLOP = 4;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;

function clip(label: string): string {
  return label.length <= 22 ? label : `${label.slice(0, 21)}…`;
}

export function ConceptGraph({ data }: { data: ConceptGraphData }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const worldEl = useRef<SVGGElement>(null);
  const nodeEls = useRef<(SVGGElement | null)[]>([]);
  const edgeEls = useRef<(SVGLineElement | null)[]>([]);
  const edgeLabelEls = useRef<(SVGTextElement | null)[]>([]);

  const model = useMemo(() => {
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

    const degrees = data.nodes.map(
      (_, i) => links.filter((link) => link.a === i || link.b === i).length,
    );
    const graph: Graph = {
      nodes: data.nodes.map((node, i) => ({
        id: node.label.toLowerCase(),
        title: node.label,
        degree: degrees[i],
        tags: [],
      })),
      links: links.map((link) => ({
        source: data.nodes[link.a].label.toLowerCase(),
        target: data.nodes[link.b].label.toLowerCase(),
      })),
    };

    const height = Math.max(220, Math.min(430, 150 + 34 * data.nodes.length));
    const layout = createLayout(graph, WIDTH, height, {
      linkDistance: 85,
      charge: -420,
    });
    let guard = 0;
    while (layout.step() && guard++ < 1000) {}

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < data.nodes.length; i++) {
      minX = Math.min(minX, layout.x[i]);
      maxX = Math.max(maxX, layout.x[i]);
      minY = Math.min(minY, layout.y[i]);
      maxY = Math.max(maxY, layout.y[i]);
    }
    const scale = Math.min(
      1.6,
      Math.max(
        0.3,
        Math.min(
          (WIDTH - PAD * 2) / Math.max(1, maxX - minX),
          (height - PAD * 2) / Math.max(1, maxY - minY),
        ),
      ),
    );
    const fit = {
      scale,
      tx: WIDTH / 2 - ((minX + maxX) / 2) * scale,
      ty: height / 2 - ((minY + maxY) / 2) * scale,
    };

    const base = Math.min(2.6, baseRadiusFor(data.nodes.length));
    const radii = degrees.map((degree) => nodeRadius(degree, base));

    const counter = 1 / Math.min(1, scale);
    const labelFont = 6 * counter;
    const edgeFont = 5 * counter;

    return { links, graph, height, layout, fit, radii, labelFont, edgeFont };
  }, [data]);

  const view = useRef({ ...model.fit });
  const frame = useRef(0);
  const active = useRef(-1);
  const moved = useRef(0);
  const panning = useRef<{ x: number; y: number } | null>(null);
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);

  useEffect(() => {
    view.current = { ...model.fit };
    applyCamera();
  }, [model]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function applyCamera() {
    const { tx, ty, scale } = view.current;
    worldEl.current?.setAttribute(
      "transform",
      `translate(${tx} ${ty}) scale(${scale})`,
    );
  }

  function applyPositions() {
    const { layout, links } = model;
    for (let i = 0; i < model.graph.nodes.length; i++) {
      nodeEls.current[i]?.setAttribute(
        "transform",
        `translate(${layout.x[i]} ${layout.y[i]})`,
      );
    }
    links.forEach((link, i) => {
      const line = edgeEls.current[i];
      if (line) {
        line.setAttribute("x1", String(layout.x[link.a]));
        line.setAttribute("y1", String(layout.y[link.a]));
        line.setAttribute("x2", String(layout.x[link.b]));
        line.setAttribute("y2", String(layout.y[link.b]));
      }
      const text = edgeLabelEls.current[i];
      if (text) {
        text.setAttribute(
          "x",
          String((layout.x[link.a] + layout.x[link.b]) / 2),
        );
        text.setAttribute(
          "y",
          String((layout.y[link.a] + layout.y[link.b]) / 2 - 3),
        );
      }
    });
  }

  function run() {
    cancelAnimationFrame(frame.current);
    const tick = () => {
      const alive = model.layout.step();
      applyPositions();
      if (alive) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }

  function toBox(event: { clientX: number; clientY: number }) {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * model.height,
    };
  }

  function toWorld(event: { clientX: number; clientY: number }) {
    const point = toBox(event);
    const { tx, ty, scale } = view.current;
    return { x: (point.x - tx) / scale, y: (point.y - ty) / scale };
  }

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = svg!.getBoundingClientRect();
      const px = ((event.clientX - rect.left) / rect.width) * WIDTH;
      const py = ((event.clientY - rect.top) / rect.height) * model.height;

      const current = view.current;
      const next = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, current.scale * Math.exp(-event.deltaY * 0.0025)),
      );
      current.tx = px - ((px - current.tx) / current.scale) * next;
      current.ty = py - ((py - current.ty) / current.scale) * next;
      current.scale = next;
      applyCamera();
    }

    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [model]);

  function zoomAbout(px: number, py: number, factor: number) {
    const current = view.current;
    const next = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, current.scale * factor),
    );
    current.tx = px - ((px - current.tx) / current.scale) * next;
    current.ty = py - ((py - current.ty) / current.scale) * next;
    current.scale = next;
    applyCamera();
  }

  function trackTouch(event: React.PointerEvent) {
    if (event.pointerType === "mouse") return false;
    touches.current.set(event.pointerId, toBox(event));
    if (touches.current.size !== 2) return touches.current.size > 2;

    const [a, b] = [...touches.current.values()];
    pinch.current = Math.hypot(a.x - b.x, a.y - b.y);
    panning.current = null;
    active.current = -1;
    return true;
  }

  function onNodeDown(index: number, event: React.PointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (trackTouch(event)) return;
    svgRef.current?.setPointerCapture(event.pointerId);
    active.current = index;
    moved.current = 0;
    model.layout.setAlphaTarget(DRAG_ALPHA);
    run();
  }

  function onBackgroundDown(event: React.PointerEvent) {
    event.preventDefault();
    if (trackTouch(event)) return;
    svgRef.current?.setPointerCapture(event.pointerId);
    panning.current = toBox(event);
  }

  function onPointerMove(event: React.PointerEvent) {
    if (touches.current.has(event.pointerId)) {
      touches.current.set(event.pointerId, toBox(event));
    }

    if (pinch.current !== null && touches.current.size >= 2) {
      const [a, b] = [...touches.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current > 0) {
        zoomAbout(
          (a.x + b.x) / 2,
          (a.y + b.y) / 2,
          distance / pinch.current,
        );
      }
      pinch.current = distance;
      return;
    }

    if (active.current >= 0) {
      const point = toWorld(event);
      moved.current = Math.max(
        moved.current,
        Math.hypot(
          point.x - model.layout.x[active.current],
          point.y - model.layout.y[active.current],
        ) * view.current.scale,
      );
      model.layout.pin(active.current, point.x, point.y);
      run();
      return;
    }
    if (panning.current) {
      const point = toBox(event);
      view.current.tx += point.x - panning.current.x;
      view.current.ty += point.y - panning.current.y;
      panning.current = point;
      applyCamera();
    }
  }

  function onPointerUp(event?: React.PointerEvent) {
    if (event) touches.current.delete(event.pointerId);
    if (touches.current.size < 2) pinch.current = null;
    panning.current = null;
    if (active.current < 0) return;
    const index = active.current;
    active.current = -1;
    model.layout.unpin(index);
    model.layout.setAlphaTarget(0);
    run();

    const slug = data.nodes[index]?.slug;
    if (moved.current <= CLICK_SLOP && slug) navigate(`/notes/${slug}`);
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${WIDTH} ${model.height}`}
      className="not-prose block w-full cursor-move touch-none border border-foreground/15"
      role="img"
      aria-label="Concept map"
      onPointerDown={onBackgroundDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <g
        ref={worldEl}
        transform={`translate(${model.fit.tx} ${model.fit.ty}) scale(${model.fit.scale})`}
      >
        {model.links.map((link, i) => (
          <g key={`${link.a}:${link.b}:${i}`}>
            <line
              ref={(el) => {
                edgeEls.current[i] = el;
              }}
              x1={model.layout.x[link.a]}
              y1={model.layout.y[link.a]}
              x2={model.layout.x[link.b]}
              y2={model.layout.y[link.b]}
              stroke="var(--foreground)"
              strokeOpacity={EDGE_ALPHA}
            />
            {link.label && (
              <text
                ref={(el) => {
                  edgeLabelEls.current[i] = el;
                }}
                x={(model.layout.x[link.a] + model.layout.x[link.b]) / 2}
                y={(model.layout.y[link.a] + model.layout.y[link.b]) / 2 - 3}
                textAnchor="middle"
                fontSize={model.edgeFont}
                fontFamily="system-ui"
                fill="var(--foreground)"
                opacity={0.55}
              >
                {clip(link.label)}
              </text>
            )}
          </g>
        ))}

        {data.nodes.map((node, i) => (
          <g
            key={node.label}
            ref={(el) => {
              nodeEls.current[i] = el;
            }}
            transform={`translate(${model.layout.x[i]} ${model.layout.y[i]})`}
            onPointerDown={(event) => onNodeDown(i, event)}
            className={node.slug ? "cursor-pointer" : "cursor-grab"}
          >
            <circle
              r={model.radii[i]}
              fill={node.slug ? "var(--accent)" : "var(--foreground)"}
            />
            <text
              y={model.radii[i] + model.labelFont + 2}
              textAnchor="middle"
              fontSize={model.labelFont}
              fontFamily="system-ui"
              fill="var(--foreground)"
              opacity={0.85}
            >
              {clip(node.label)}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
