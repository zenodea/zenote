"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCanvasSize } from "@/hooks/use-canvas-size";
import { useEscape } from "@/hooks/use-hotkey";
import { useLatestRef } from "@/hooks/use-latest-ref";
import { useLoadingIndicator } from "@/hooks/use-loading-indicator";
import { useRenderLoop } from "@/hooks/use-render-loop";
import { createLayout } from "@/lib/graph/force-layout";
import { createSolver } from "@/lib/graph/solver";
import { indexGraph, neighbourhood, type Graph } from "@/lib/graph/model";
import { nodesWithTags, tagCounts } from "@/lib/graph/derive";
import { baseRadiusFor, hitTest } from "@/lib/graph/geometry";
import type { PixiScene } from "@/lib/graph/pixi-scene";
import { beginPageFade } from "@/lib/page-fade";
import { setGraphReady } from "@/lib/stores/graph-ready";
import {
  useRouteLoaderShowing,
  useRouteWait,
} from "@/lib/stores/route-loading";
import { subscribeToTheme } from "@/lib/theme";
import { FocusChip } from "@/components/graph/FocusChip";
import { GraphToolbar } from "@/components/graph/GraphToolbar";
import { DiamondLoader } from "@/components/ui/DiamondLoader";
import { useFocusFade } from "@/components/graph/use-focus-fade";
import {
  FIT_OVERSCAN,
  useGraphCamera,
} from "@/components/graph/use-graph-camera";

const STEPS_PER_FRAME = 2;
const DRAG_ALPHA = 0.1;
const CLICK_SLOP = 4;

// The scene needs concrete colours; tokens resolve lazily so the first frame
// never paints fallback colours in a themed session.
function resolvePalette() {
  const style = getComputedStyle(document.documentElement);
  return {
    foreground: style.getPropertyValue("--foreground").trim() || "#171717",
    background: style.getPropertyValue("--background").trim() || "#ffffff",
    accent: style.getPropertyValue("--accent").trim() || "#7c3aed",
  };
}

export function GraphView({
  graph,
  focusId,
  controls = true,
  standalone = false,
}: {
  graph: Graph;
  focusId?: string;
  controls?: boolean;
  standalone?: boolean;
}) {
  const router = useRouter();
  const { canvasRef, size } = useCanvasSize();
  const sceneRef = useRef<PixiScene | null>(null);

  const layout = useMemo(() => createLayout(graph, 1000, 700), [graph]);

  // Solved once to place the camera; live-fitting reads as drift. The solve
  // runs on a worker and the camera fits when it lands, so the wait is spent
  // on a thread that owes the loader nothing.
  const solver = useMemo(() => createSolver(graph, 1000, 700), [graph]);
  const target = useCallback(() => solver.get(), [solver]);

  const { edges, neighbours } = useMemo(() => indexGraph(graph), [graph]);
  const baseRadius = baseRadiusFor(graph.nodes.length);

  // Held by id, not index: a rebuilt graph renumbers every node, and a focus
  // kept positionally would quietly move to whichever note took that slot. A
  // note that has gone drops out of the focus instead.
  const [seedIds, setSeedIds] = useState<string[]>(focusId ? [focusId] : []);
  const seeds = useMemo(
    () =>
      seedIds
        .map((id) => graph.nodes.findIndex((node) => node.id === id))
        .filter((index) => index >= 0),
    [seedIds, graph],
  );
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
  const sizeRef = useLatestRef(size);
  const graphRef = useLatestRef({ graph, edges, baseRadius });

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
    activeSet,
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
  const layoutMovingRef = useRef(true);
  const [booted, setBooted] = useState(false);

  // Standalone, the wait is the route's and the layout's loader carries it —
  // already running from the fallback, so nothing restarts here. Inset in a
  // note, the route arrived long ago and the mark stays local to the box.
  useRouteWait(standalone && !booted);
  const routeShowing = useRouteLoaderShowing();
  const localLoader = useLoadingIndicator(!standalone && !booted);
  const covered = !booted || (standalone ? routeShowing : localLoader);

  // Counts and controls describe a graph nobody can see yet, so they wait for
  // the cover rather than for the data.
  useEffect(() => {
    if (standalone) setGraphReady(!covered);
  }, [standalone, covered]);

  useEffect(() => () => setGraphReady(false), []);

  const clearFocus = useCallback(() => {
    setSeedIds([]);
    setDepth(1);
  }, []);

  const draw = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    scene.update({
      x: layout.x,
      y: layout.y,
      view: viewRef.current,
      fitScale: fitScaleRef.current,
      highlight: highlightRef.current,
      labelFocus: labelFocusRef.current,
      focusAmount: focusAmountRef.current,
      near: activeSet(),
      seeds: seedsRef.current,
      visible: visibleRef.current,
      positionsDirty: layoutMovingRef.current,
    });
    scene.render();
  }, [
    layout,
    viewRef,
    fitScaleRef,
    highlightRef,
    labelFocusRef,
    focusAmountRef,
    activeSet,
    seedsRef,
    visibleRef,
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
    layoutMovingRef.current = moving;

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

  const ready = size.width > 0 && size.height > 0;

  // One Application per canvas lifetime: a canvas cannot host a second WebGL
  // context, so graph swaps go through scene.setGraph instead.
  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;

    // Started before anything is awaited, so the worker solves through the
    // chunk download and the WebGL init rather than after them.
    const settled = solver.prime();

    (async () => {
      const { PixiScene } = await import("@/lib/graph/pixi-scene");
      const scene = await PixiScene.create(
        canvas,
        sizeRef.current.width,
        sizeRef.current.height,
        resolvePalette(),
      );
      if (disposed) {
        scene.destroy();
        return;
      }
      const latest = graphRef.current;
      scene.setGraph(latest.graph.nodes, latest.edges, latest.baseRadius);
      sceneRef.current = scene;

      await settled;
      if (disposed) return;

      fitIfUntouched();
      start();
      setBooted(true);
    })();

    return () => {
      disposed = true;
      sceneRef.current?.destroy();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => () => solver.dispose(), [solver]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setGraph(graph.nodes, edges, baseRadius);
    layoutMovingRef.current = true;
    start();

    // A swapped graph has its own solve to wait on; the sim runs meanwhile.
    let stale = false;
    solver.prime().then(() => {
      if (stale) return;
      fitIfUntouched();
      start();
    });
    return () => {
      stale = true;
    };
  }, [graph, edges, baseRadius, fitIfUntouched, start, solver]);

  useEffect(() => {
    if (!ready) return;
    sceneRef.current?.resize(size.width, size.height);
    fitIfUntouched();
    draw();
  }, [ready, size, fitIfUntouched, draw]);

  // Read through refs by draw(), so a change has to wake the parked loop by hand.
  useEffect(() => {
    start();
  }, [start, focus, seeds, visible]);

  useEffect(() => {
    const sync = () => {
      sceneRef.current?.setPalette(resolvePalette());
      draw();
    };

    sync();
    return subscribeToTheme(sync);
  }, [draw]);

  useEscape(clearFocus, controls);

  const focusNode = useCallback(
    (node: number) => {
      setSeedIds([graph.nodes[node].id]);
      setDepth(1);
      frameNodes(neighbourhood(neighbours, [node], 1));
      start();
    },
    [graph, frameNodes, neighbours, start],
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

      const id = graph.nodes[node].id;
      setSeedIds((current) =>
        current.includes(id)
          ? current.filter((seed) => seed !== id)
          : [...current, id],
      );
    }

    canvas.addEventListener("wheel", onWheel, { passive: false });
    if (controls) canvas.addEventListener("contextmenu", onContextMenu);
    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onContextMenu);
    };
  }, [canvasRef, graph, toLocal, nodeAt, zoomAt, start, clearFocus, controls]);

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
      start();
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
        beginPageFade();
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
      {controls && !covered && seeds.length > 0 && (
        <FocusChip
          label={seeds.map((seed) => graph.nodes[seed].title).join(", ")}
          depth={depth}
          noteCount={focus?.size ?? 0}
          onExpand={() => setDepth((current) => current + 1)}
          onShrink={() => setDepth((current) => Math.max(1, current - 1))}
          onClear={clearFocus}
        />
      )}

      {controls && !covered && (
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

      {/* Covers the WebGL chunk download and context creation, which is most of
          the wait on a cold graph. It lifts with the loader, not before it, so
          the mark is never left standing over a graph that is already up. */}
      <div
        className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-background transition-opacity duration-200"
        style={{ opacity: covered ? 1 : 0 }}
        aria-hidden={!covered}
      >
        {!standalone && localLoader && <DiamondLoader size={20} />}
      </div>

      {/* Canvas is opaque to keyboards and screen readers; mirror nodes as links. */}
      <ul className="sr-only">
        {graph.nodes.map((node) => (
          <li key={node.id}>
            <a href={`/notes/${node.id}`}>{node.title}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
