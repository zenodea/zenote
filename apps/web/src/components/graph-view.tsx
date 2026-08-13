"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createLayout, solveLayout } from "@/lib/force-layout";
import { indexGraph, neighbourhood, type Graph } from "@/lib/graph";
import { drawGraph, hitTest, type View } from "@/lib/graph-draw";
import { subscribeToTheme } from "@/lib/theme";
import { FocusChip } from "@/components/focus-chip";
import { TagFilter } from "@/components/tag-filter";

const MIN_SCALE = 0.05;
const MAX_SCALE = 8;
const FIT_PADDING = 40;
const FIT_OVERSCAN = 2.2;
const STEPS_PER_FRAME = 2;
const FADE = 0.18;
const VIEW_EASE = 0.22;
const FRICTION = 0.88;
const MIN_VELOCITY = 0.08;
const DRAG_ALPHA = 0.1;
const CLICK_SLOP = 4;

export function GraphView({ graph }: { graph: Graph }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const layout = useMemo(() => createLayout(graph, 1000, 700), [graph]);

  // Solved up front so the camera can be placed once. Fitting to the live
  // layout each frame reads as the whole graph drifting.
  const target = useMemo(() => solveLayout(graph, 1000, 700), [graph]);

  const { edges, neighbours } = useMemo(() => indexGraph(graph), [graph]);

  const baseRadius = Math.max(
    1.8,
    Math.min(6, 9 / Math.pow(Math.max(graph.nodes.length, 1), 0.2)),
  );

  const view = useRef<View>({ x: 0, y: 0, scale: 1 });
  const viewTarget = useRef<View>({ x: 0, y: 0, scale: 1 });
  const fitScale = useRef(1);
  const velocity = useRef({ x: 0, y: 0 });
  const size = useRef({ width: 0, height: 0 });
  const hovered = useRef<number | null>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const [seeds, setSeeds] = useState<number[]>([]);
  const [depth, setDepth] = useState(1);
  const seedsRef = useRef<number[]>([]);

  const focus = useMemo(
    () => (seeds.length === 0 ? null : neighbourhood(neighbours, seeds, depth)),
    [seeds, depth, neighbours],
  );

  const clearFocus = useCallback(() => {
    setSeeds([]);
    setDepth(1);
  }, []);

  const [activeTags, setActiveTags] = useState<string[]>([]);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const node of graph.nodes) {
      for (const tag of node.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
  }, [graph]);

  /** Indices still shown. Null means no filter, which skips every check. */
  const visible = useMemo(() => {
    if (activeTags.length === 0) return null;
    const wanted = new Set(activeTags);
    const shown = new Set<number>();
    graph.nodes.forEach((node, i) => {
      if (node.tags.some((tag) => wanted.has(tag))) shown.add(i);
    });
    return shown;
  }, [graph, activeTags]);

  const visibleRef = useRef<Set<number> | null>(null);
  const focusRef = useRef<Set<number> | null>(null);
  const adjusted = useRef(false);
  const drag = useRef<{ node: number; moved: number; active: boolean } | null>(
    null,
  );
  const pan = useRef<{ x: number; y: number } | null>(null);
  const frame = useRef(0);
  const running = useRef(false);
  // Both are hoisted out of draw(): getContext and getComputedStyle are cheap
  // in Chrome but measurably expensive per frame in Firefox.
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const colorsRef = useRef({ foreground: "#171717", accent: "#7c3aed" });

  const fit = useCallback((instant = false) => {
    const count = target.x.length;
    const { width, height } = size.current;
    if (!count || !width || !height) return;

    const xs = Float64Array.from(target.x).sort();
    const ys = Float64Array.from(target.y).sort();
    const low = Math.floor(count * 0.01);
    const high = Math.min(count - 1, Math.ceil(count * 0.99));

    const spanX = Math.max(xs[high] - xs[low], 1);
    const spanY = Math.max(ys[high] - ys[low], 1);
    const scale = Math.max(
      MIN_SCALE,
      Math.min(
        MAX_SCALE,
        ((width - FIT_PADDING * 2) / spanX) * FIT_OVERSCAN,
        ((height - FIT_PADDING * 2) / spanY) * FIT_OVERSCAN,
      ),
    );

    const next = {
      scale,
      x: width / 2 - ((xs[low] + xs[high]) / 2) * scale,
      y: height / 2 - ((ys[low] + ys[high]) / 2) * scale,
    };

    fitScale.current = scale;
    viewTarget.current = next;
    velocity.current = { x: 0, y: 0 };
    if (instant) view.current = { ...next };
  }, [target]);

  const highlight = useRef<Float32Array>(
    new Float32Array(graph.nodes.length).fill(1),
  );
  const focusAmount = useRef(0);
  // Rests at 0, unlike `highlight` which rests at 1. Multiplying highlight by
  // the focus amount makes every label flash as the two curves cross.
  const labelFocus = useRef<Float32Array>(
    new Float32Array(graph.nodes.length),
  );

  const hoverSet = useRef<{ node: number; set: Set<number> } | null>(null);

  const activeSet = useCallback(() => {
    if (focusRef.current) return focusRef.current;

    const hoverIndex = hovered.current;
    if (hoverIndex === null) return null;

    // Cached: this runs every frame during a fade, and rebuilding the set each
    // time allocates for nothing.
    if (hoverSet.current?.node !== hoverIndex) {
      hoverSet.current = {
        node: hoverIndex,
        set: new Set<number>([hoverIndex, ...neighbours[hoverIndex]]),
      };
    }
    return hoverSet.current.set;
  }, [neighbours]);

  const setHovered = useCallback((node: number | null) => {
    hovered.current = node;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = node === null ? "grab" : "pointer";
    }
  }, []);

  const advanceView = useCallback(() => {
    const current = view.current;
    const goal = viewTarget.current;
    let moving = false;

    if (!pan.current) {
      const speed = Math.hypot(velocity.current.x, velocity.current.y);
      if (speed > MIN_VELOCITY) {
        goal.x += velocity.current.x;
        goal.y += velocity.current.y;
        velocity.current.x *= FRICTION;
        velocity.current.y *= FRICTION;
        moving = true;
      } else {
        velocity.current.x = 0;
        velocity.current.y = 0;
      }
    }

    const dx = goal.x - current.x;
    const dy = goal.y - current.y;
    if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
      current.x += dx * VIEW_EASE;
      current.y += dy * VIEW_EASE;
      moving = true;
    } else {
      current.x = goal.x;
      current.y = goal.y;
    }

    // Geometric, not linear: zoom is perceived multiplicatively, so a linear
    // ramp between two scales reads as fast-then-crawling.
    const ratio = goal.scale / current.scale;
    if (Math.abs(Math.log(ratio)) > 0.0008) {
      current.scale *= Math.pow(ratio, VIEW_EASE);
      moving = true;
    } else {
      current.scale = goal.scale;
    }

    return moving;
  }, []);

  const advanceFade = useCallback(() => {
    const near = activeSet();
    const values = highlight.current;
    const labels = labelFocus.current;
    let moving = false;

    // One FADE step toward `target`, snapping once close enough.
    const ease = (value: number, target: number) => {
      if (Math.abs(target - value) < 0.004) return target;
      moving = true;
      return value + (target - value) * FADE;
    };

    for (let i = 0; i < values.length; i++) {
      const inFocus = near !== null && near.has(i);
      values[i] = ease(values[i], near === null || inFocus ? 1 : 0);
      labels[i] = ease(labels[i], inFocus ? 1 : 0);
    }
    focusAmount.current = ease(focusAmount.current, near === null ? 0 : 1);

    return moving;
  }, [activeSet]);

  const draw = useCallback(() => {
    const context = contextRef.current;
    if (!context) return;

    drawGraph({
      context,
      width: size.current.width,
      height: size.current.height,
      view: view.current,
      foreground: colorsRef.current.foreground,
      accent: colorsRef.current.accent,
      fitScale: fitScale.current,
      x: layout.x,
      y: layout.y,
      nodes: graph.nodes,
      edges,
      baseRadius,
      highlight: highlight.current,
      labelFocus: labelFocus.current,
      focusAmount: focusAmount.current,
      seeds: seedsRef.current,
      visible: visibleRef.current,
    });
  }, [layout, edges, graph, baseRadius]);

  const toLocal = useCallback((event: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }, []);

  const nodeAt = useCallback(
    (point: { x: number; y: number }) =>
      hitTest(
        point,
        view.current,
        layout.x,
        layout.y,
        graph.nodes,
        baseRadius,
        visibleRef.current,
      ),
    [layout, graph, baseRadius],
  );

  const start = useCallback(() => {
    if (running.current) return;
    running.current = true;

    function run() {
      let moving = false;
      for (let i = 0; i < STEPS_PER_FRAME; i++) {
        moving = layout.step() || moving;
      }

      if (!drag.current && !pan.current && pointer.current) {
        const node = nodeAt(pointer.current);
        if (node !== hovered.current) setHovered(node);
      }

      const fading = advanceFade();
      const gliding = advanceView();
      draw();

      if (moving || fading || gliding || drag.current || pan.current) {
        frame.current = requestAnimationFrame(run);
      } else {
        running.current = false;
      }
    }

    frame.current = requestAnimationFrame(run);
  }, [layout, draw, advanceFade, advanceView, nodeAt, setHovered]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const observer = new ResizeObserver(() => {
      const ratio = window.devicePixelRatio || 1;
      const width = parent.clientWidth;
      const height = parent.clientHeight;

      size.current = { width, height };
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const context = canvas.getContext("2d");
      contextRef.current = context;
      context?.setTransform(ratio, 0, 0, ratio, 0, 0);

      if (!adjusted.current) fit(true);
      draw();
    });

    observer.observe(parent);
    return () => observer.disconnect();
  }, [fit, draw]);

  useEffect(() => {
    start();
    return () => {
      cancelAnimationFrame(frame.current);
      running.current = false;
    };
  }, [start]);

  // Refs are synced here rather than during render so draw(), which runs
  // outside React, sees the new focus before the next frame.
  useEffect(() => {
    focusRef.current = focus;
    seedsRef.current = seeds;
    visibleRef.current = visible;
    start();
  }, [focus, seeds, visible, start]);

  // The canvas can't use CSS variables directly, so resolve the theme tokens
  // whenever <html data-theme> changes (the theme picker's source of truth).
  useEffect(() => {
    const sync = () => {
      const style = getComputedStyle(document.documentElement);
      colorsRef.current = {
        foreground: style.getPropertyValue("--foreground").trim() || "#171717",
        accent: style.getPropertyValue("--accent").trim() || "#7c3aed",
      };
      draw();
    };

    sync();
    return subscribeToTheme(sync);
  }, [draw]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") clearFocus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clearFocus]);

  const zoomAt = useCallback(
    (anchor: { x: number; y: number }, factor: number) => {
      adjusted.current = true;

      // Anchored on the target rather than the rendered view, so a fast
      // scroll accumulates instead of fighting the in-flight animation.
      const current = viewTarget.current;
      const scale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, current.scale * factor),
      );

      viewTarget.current = {
        scale,
        x: anchor.x - ((anchor.x - current.x) / current.scale) * scale,
        y: anchor.y - ((anchor.y - current.y) / current.scale) * scale,
      };
      start();
    },
    [start],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Both listeners are native, not React props: onWheel is passive so it
    // cannot preventDefault the page scroll, and React's contextmenu
    // delegation does not reliably suppress the browser menu.
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      zoomAt(toLocal(event), Math.exp(-event.deltaY * 0.0015));
    }

    function onContextMenu(event: MouseEvent) {
      event.preventDefault();
      event.stopPropagation();

      const node = nodeAt(toLocal(event));

      if (node === null) {
        clearFocus();
        return;
      }

      setSeeds((current) =>
        current.includes(node)
          ? current.filter((seed) => seed !== node)
          : [...current, node],
      );
    }

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("contextmenu", onContextMenu);
    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onContextMenu);
    };
  }, [toLocal, nodeAt, zoomAt, clearFocus]);

  function onPointerDown(event: React.PointerEvent) {
    if (event.button === 2) return;

    const point = toLocal(event);
    pointer.current = point;
    const node = nodeAt(point);
    canvasRef.current?.setPointerCapture(event.pointerId);

    if (node !== null) {
      drag.current = { node, moved: 0, active: false };
    } else {
      pan.current = point;
      velocity.current = { x: 0, y: 0 };
      viewTarget.current = { ...view.current };
    }
  }

  function onPointerMove(event: React.PointerEvent) {
    const point = toLocal(event);
    pointer.current = point;
    const { x: tx, y: ty, scale } = view.current;

    if (drag.current) {
      drag.current.moved += Math.hypot(event.movementX, event.movementY);
      if (drag.current.moved < CLICK_SLOP) return;
      if (!drag.current.active) {
        drag.current.active = true;
        layout.setAlphaTarget(DRAG_ALPHA);
        layout.reheat(DRAG_ALPHA);
      }
      layout.pin(drag.current.node, (point.x - tx) / scale, (point.y - ty) / scale);
      start();
      return;
    }

    if (pan.current) {
      adjusted.current = true;
      const dx = point.x - pan.current.x;
      const dy = point.y - pan.current.y;

      view.current = { scale, x: tx + dx, y: ty + dy };
      viewTarget.current = {
        scale: viewTarget.current.scale,
        x: viewTarget.current.x + dx,
        y: viewTarget.current.y + dy,
      };

      velocity.current = {
        x: velocity.current.x * 0.6 + dx * 0.4,
        y: velocity.current.y * 0.6 + dy * 0.4,
      };

      pan.current = point;
      draw();
      return;
    }

    const node = nodeAt(point);
    if (node !== hovered.current) {
      setHovered(node);
      if (seedsRef.current.length === 0) start();
    }
  }

  function onPointerUp() {
    if (drag.current) {
      const { node, active } = drag.current;
      drag.current = null;
      if (active) {
        layout.unpin(node);
        layout.setAlphaTarget(0);
      } else {
        router.push(`/notes/${graph.nodes[node].id}`);
      }
      start();
    }

    if (pan.current) {
      pan.current = null;
      start();
    }
  }

  function onPointerLeave() {
    onPointerUp();
    pointer.current = null;
    if (hovered.current !== null) {
      setHovered(null);
      start();
    }
  }

  function zoomBy(factor: number) {
    const { width, height } = size.current;
    zoomAt({ x: width / 2, y: height / 2 }, factor);
  }

  const buttonClass =
    "h-7 rounded border border-foreground/15 bg-background/70 px-2 backdrop-blur hover:bg-foreground/10";

  return (
    <div className="relative h-full w-full">
      {seeds.length > 0 && (
        <FocusChip
          label={seeds.map((seed) => graph.nodes[seed].title).join(", ")}
          depth={depth}
          noteCount={focus?.size ?? 0}
          onExpand={() => setDepth((current) => current + 1)}
          onShrink={() => setDepth((current) => Math.max(1, current - 1))}
          onClear={clearFocus}
        />
      )}

      <div className="absolute right-2 top-2 z-10 flex max-w-[calc(100%-1rem)] flex-wrap justify-end gap-1 text-sm">
        <TagFilter
          tagCounts={tagCounts}
          activeTags={activeTags}
          onChange={setActiveTags}
          visibleCount={visible?.size ?? null}
          total={graph.nodes.length}
          buttonClass={buttonClass}
        />
        <button type="button" onClick={() => zoomBy(1.3)} className={buttonClass} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.3)} className={buttonClass} aria-label="Zoom out">
          −
        </button>
        <button
          type="button"
          onClick={() => {
            adjusted.current = false;
            fit();
            start();
          }}
          className={buttonClass}
        >
          Reset
        </button>
      </div>

      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        style={{ cursor: "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
      />

      {/* A canvas is opaque to keyboards and screen readers, so the nodes also
          exist as real links here. */}
      <ul className="sr-only">
        {graph.nodes.map((node) => (
          <li key={node.id}>
            <Link href={`/notes/${node.id}`} prefetch={false}>
              {node.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
