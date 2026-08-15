"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCanvasSurface } from "@/hooks/use-canvas-surface";
import { useEscape } from "@/hooks/use-hotkey";
import { useLatestRef } from "@/hooks/use-latest-ref";
import { useRenderLoop } from "@/hooks/use-render-loop";
import { createLayout, solveLayout } from "@/lib/graph/force-layout";
import { indexGraph, neighbourhood, type Graph } from "@/lib/graph/model";
import { nodesWithTags, tagCounts } from "@/lib/graph/derive";
import { baseRadiusFor, drawGraph, hitTest } from "@/lib/graph/draw";
import { subscribeToTheme } from "@/lib/theme";
import { FocusChip } from "@/components/graph/FocusChip";
import { GraphToolbar } from "@/components/graph/GraphToolbar";
import { useFocusFade } from "@/components/graph/use-focus-fade";
import {
  FIT_OVERSCAN,
  useGraphCamera,
} from "@/components/graph/use-graph-camera";

const STEPS_PER_FRAME = 2;
const DRAG_ALPHA = 0.1;
const CLICK_SLOP = 4;

export function GraphView({
  graph,
  focusId,
  controls = true,
}: {
  graph: Graph;
  focusId?: string;
  controls?: boolean;
}) {
  const router = useRouter();
  const { canvasRef, contextRef, size } = useCanvasSurface();

  const layout = useMemo(() => createLayout(graph, 1000, 700), [graph]);

  // Solved up front to place the camera once; live-fitting reads as drift.
  const target = useMemo(() => solveLayout(graph, 1000, 700), [graph]);

  const { edges, neighbours } = useMemo(() => indexGraph(graph), [graph]);
  const baseRadius = baseRadiusFor(graph.nodes.length);

  const [seeds, setSeeds] = useState<number[]>(() => {
    const index = focusId
      ? graph.nodes.findIndex((node) => node.id === focusId)
      : -1;
    return index < 0 ? [] : [index];
  });
  const [depth, setDepth] = useState(1);
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const focus = useMemo(
    () => (seeds.length === 0 ? null : neighbourhood(neighbours, seeds, depth)),
    [seeds, depth, neighbours],
  );
  const visible = useMemo(
    () => nodesWithTags(graph, activeTags),
    [graph, activeTags],
  );
  const tags = useMemo(() => tagCounts(graph), [graph]);

  const seedsRef = useLatestRef(seeds);
  const visibleRef = useLatestRef(visible);

  const {
    viewRef,
    fitScaleRef,
    panningRef,
    fitIfUntouched,
    resetView,
    frameNodes,
    zoomAt,
    zoomBy,
    beginPan,
    panTo,
    endPan,
    advanceView,
  } = useGraphCamera({
    layout,
    target,
    size,
    overscan: controls ? FIT_OVERSCAN : 1,
  });

  const {
    hoveredRef,
    highlightRef,
    labelFocusRef,
    focusAmountRef,
    setHovered,
    advanceFade,
  } = useFocusFade({
    nodeCount: graph.nodes.length,
    neighbours,
    focus,
    canvasRef,
  });

  const pointer = useRef<{ x: number; y: number } | null>(null);
  const drag = useRef<{ node: number; moved: number; active: boolean } | null>(
    null,
  );
  // Hoisted out of draw(): resolving theme tokens is expensive per frame in Firefox.
  const colors = useRef({ foreground: "#171717", accent: "#7c3aed" });

  const clearFocus = useCallback(() => {
    setSeeds([]);
    setDepth(1);
  }, []);

  const draw = useCallback(() => {
    const context = contextRef.current;
    if (!context || !size.width || !size.height) return;

    drawGraph({
      context,
      width: size.width,
      height: size.height,
      view: viewRef.current,
      foreground: colors.current.foreground,
      accent: colors.current.accent,
      fitScale: fitScaleRef.current,
      x: layout.x,
      y: layout.y,
      nodes: graph.nodes,
      edges,
      baseRadius,
      highlight: highlightRef.current,
      labelFocus: labelFocusRef.current,
      focusAmount: focusAmountRef.current,
      seeds: seedsRef.current,
      visible: visibleRef.current,
    });
  }, [
    contextRef,
    viewRef,
    fitScaleRef,
    highlightRef,
    labelFocusRef,
    focusAmountRef,
    seedsRef,
    visibleRef,
    size,
    layout,
    graph,
    edges,
    baseRadius,
  ]);

  const toLocal = useCallback(
    (event: { clientX: number; clientY: number }) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    },
    [canvasRef],
  );

  const nodeAt = useCallback(
    (point: { x: number; y: number }) =>
      hitTest(
        point,
        viewRef.current,
        layout.x,
        layout.y,
        graph.nodes,
        baseRadius,
        visibleRef.current,
      ),
    [viewRef, visibleRef, layout, graph, baseRadius],
  );

  const start = useRenderLoop(() => {
    let moving = false;
    for (let i = 0; i < STEPS_PER_FRAME; i++) {
      moving = layout.step() || moving;
    }

    if (!drag.current && !panningRef.current && pointer.current) {
      const node = nodeAt(pointer.current);
      if (node !== hoveredRef.current) setHovered(node);
    }

    const fading = advanceFade();
    const gliding = advanceView();
    draw();

    return Boolean(
      moving || fading || gliding || drag.current || panningRef.current,
    );
  });

  useEffect(() => {
    fitIfUntouched();
    draw();
  }, [fitIfUntouched, draw]);

  // Read through refs by draw(), so a change has to wake the parked loop by hand.
  useEffect(() => {
    start();
  }, [start, focus, seeds, visible]);

  // Canvas needs concrete colours: resolve theme tokens on data-theme changes.
  useEffect(() => {
    const sync = () => {
      const style = getComputedStyle(document.documentElement);
      colors.current = {
        foreground: style.getPropertyValue("--foreground").trim() || "#171717",
        accent: style.getPropertyValue("--accent").trim() || "#7c3aed",
      };
      draw();
    };

    sync();
    return subscribeToTheme(sync);
  }, [draw]);

  useEscape(clearFocus, controls);

  const focusNode = useCallback(
    (node: number) => {
      setSeeds([node]);
      setDepth(1);
      frameNodes(neighbourhood(neighbours, [node], 1));
      start();
    },
    [frameNodes, neighbours, start],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Native listeners: React's onWheel is passive; its contextmenu delegation is unreliable.
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      zoomAt(toLocal(event), Math.exp(-event.deltaY * 0.0015));
      start();
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
    if (controls) canvas.addEventListener("contextmenu", onContextMenu);
    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onContextMenu);
    };
  }, [canvasRef, toLocal, nodeAt, zoomAt, start, clearFocus, controls]);

  function onPointerDown(event: React.PointerEvent) {
    if (event.button === 2) return;

    const point = toLocal(event);
    pointer.current = point;
    const node = nodeAt(point);
    canvasRef.current?.setPointerCapture(event.pointerId);

    if (node !== null) {
      drag.current = { node, moved: 0, active: false };
    } else {
      beginPan(point);
    }
  }

  function onPointerMove(event: React.PointerEvent) {
    const point = toLocal(event);
    pointer.current = point;

    if (drag.current) {
      drag.current.moved += Math.hypot(event.movementX, event.movementY);
      if (drag.current.moved < CLICK_SLOP) return;
      if (!drag.current.active) {
        drag.current.active = true;
        layout.setAlphaTarget(DRAG_ALPHA);
        layout.reheat(DRAG_ALPHA);
      }

      const { x: tx, y: ty, scale } = viewRef.current;
      layout.pin(
        drag.current.node,
        (point.x - tx) / scale,
        (point.y - ty) / scale,
      );
      start();
      return;
    }

    if (panningRef.current) {
      panTo(point);
      draw();
      return;
    }

    const node = nodeAt(point);
    if (node !== hoveredRef.current) {
      setHovered(node);
      if (seeds.length === 0) start();
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

    if (panningRef.current) {
      endPan();
      start();
    }
  }

  function onPointerLeave() {
    onPointerUp();
    pointer.current = null;
    if (hoveredRef.current !== null) {
      setHovered(null);
      start();
    }
  }

  function zoom(factor: number) {
    zoomBy(factor);
    start();
  }

  return (
    <div className="relative h-full w-full">
      {controls && seeds.length > 0 && (
        <FocusChip
          label={seeds.map((seed) => graph.nodes[seed].title).join(", ")}
          depth={depth}
          noteCount={focus?.size ?? 0}
          onExpand={() => setDepth((current) => current + 1)}
          onShrink={() => setDepth((current) => Math.max(1, current - 1))}
          onClear={clearFocus}
        />
      )}

      {controls && (
        <GraphToolbar
          nodes={graph.nodes}
          onSelectNode={focusNode}
          tagCounts={tags}
          activeTags={activeTags}
          onTagsChange={setActiveTags}
          visibleCount={visible?.size ?? null}
          total={graph.nodes.length}
          onZoomIn={() => zoom(1.3)}
          onZoomOut={() => zoom(1 / 1.3)}
          onReset={() => {
            resetView();
            start();
          }}
        />
      )}

      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        style={{ cursor: "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
      />

      {/* Canvas is opaque to keyboards and screen readers; mirror nodes as links. */}
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
