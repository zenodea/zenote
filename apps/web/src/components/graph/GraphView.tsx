"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAiAssistant } from "@/components/ai/AiAssistant";
import { useCanvasSize } from "@/hooks/use-canvas-size";
import { useEscape } from "@/hooks/use-hotkey";
import { useLatestRef } from "@/hooks/use-latest-ref";
import { useLoadingIndicator } from "@/hooks/use-loading-indicator";
import { useRenderLoop } from "@/hooks/use-render-loop";
import {
  cachedClusterNames,
  storeClusterNames,
} from "@/lib/cluster-name-cache";
import { createLayout } from "@/lib/graph/force-layout";
import { findClusters } from "@/lib/graph/clusters";
import { createSolver } from "@/lib/graph/solver";
import { indexGraph, neighbourhood, type Graph } from "@/lib/graph/model";
import { nodesWithTags, tagCounts } from "@/lib/graph/derive";
import { baseRadiusFor, hitTest } from "@/lib/graph/geometry";
import type { PixiScene } from "@/lib/graph/pixi-scene";
import { beginPageFade } from "@/lib/page-fade";
import { setGraphFocus, useGraphFocus } from "@/lib/stores/graph-focus";
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
const LONG_PRESS_MS = 450;

// Tokens resolve lazily, so the first frame never paints fallbacks in a themed session.
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
  const { open: assisting } = useAiAssistant();
  const { canvasRef, size } = useCanvasSize();
  const sceneRef = useRef<PixiScene | null>(null);

  const layout = useMemo(() => createLayout(graph, 1000, 700), [graph]);

  // Solved once to place the camera — live-fitting reads as drift — and off the main thread.
  const solver = useMemo(() => createSolver(graph, 1000, 700), [graph]);
  const target = useCallback(() => solver.get(), [solver]);

  const { edges, neighbours } = useMemo(() => indexGraph(graph), [graph]);
  const baseRadius = baseRadiusFor(graph.nodes.length);

  // Held by id: a rebuilt graph renumbers nodes, so a positional focus would drift.
  const shared = useGraphFocus();
  const [own, setOwn] = useState<string[]>(focusId ? [focusId] : []);
  const seedIds = standalone ? shared : own;
  const setSeedIds = useMemo(
    () => (standalone ? setGraphFocus : setOwn),
    [standalone],
  );
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
    holdStill,
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
  // Touch: every finger down, the pinch it may become, and the press it may become.
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layoutMovingRef = useRef(true);
  const [booted, setBooted] = useState(false);

  // Standalone the wait is the route's, already running from the fallback; inset it stays local to the box.
  useRouteWait(standalone && !booted);
  const routeShowing = useRouteLoaderShowing();
  const localLoader = useLoadingIndicator(!standalone && !booted);
  const covered = !booted || (standalone ? routeShowing : localLoader);

  // Counts and controls describe a graph nobody can see yet, so they wait for the cover, not the data.
  useEffect(() => {
    if (standalone) setGraphReady(!covered);
  }, [standalone, covered]);

  useEffect(() => () => setGraphReady(false), []);

  useEffect(() => () => clearTimeout(press.current ?? undefined), []);

  const clearFocus = useCallback(() => {
    setSeedIds([]);
    setDepth(1);
  }, [setSeedIds]);

  // Right-click on a desktop, long-press on a phone: the same pick.
  const toggleSeedAt = useCallback(
    (node: number | null) => {
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
    },
    [graph, clearFocus, setSeedIds],
  );

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

  // One Application per canvas: a canvas cannot host a second WebGL context, so swaps go through setGraph.
  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;

    // Started before anything is awaited, so the worker solves through the download and WebGL init.
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

  const placed = useRef<DOMRect | null>(null);
  useEffect(() => {
    if (!ready) return;
    sceneRef.current?.resize(size.width, size.height);

    // Only the first measurement frames it; later ones are just panes sliding open.
    const previous = placed.current;
    const rect = canvasRef.current?.getBoundingClientRect() ?? null;
    placed.current = rect;

    if (!previous) fitIfUntouched();
    else if (rect)
      holdStill(previous.left - rect.left, previous.top - rect.top);

    draw();
  }, [ready, size, canvasRef, fitIfUntouched, holdStill, draw]);

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

  // Regions: the layout has already grouped these notes, the model says what they are.
  useEffect(() => {
    if (!standalone || !booted) return;
    const scene = sceneRef.current;
    if (!scene) return;

    const clusters = findClusters(graph);
    if (clusters.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const groups = clusters.map((c) => c.slugs);
        let names = cachedClusterNames(groups);
        if (!names) {
          const response = await fetch("/api/clusters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clusters: groups }),
          });
          names = ((await response.json()) as { names?: string[] }).names ?? [];
          if (names.length > 0) storeClusterNames(groups, names);
        }
        if (cancelled || names.length === 0) return;

        scene.setRegions(
          clusters
            .map((cluster, index) => ({
              name: names[index] ?? "",
              nodes: cluster.nodes,
            }))
            .filter((region) => region.name),
        );
        start();
      } catch {
        // No names is simply a graph without regions.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [standalone, booted, graph, start]);

  // Not while the assistant is open: the focus is its subject.
  useEscape(clearFocus, controls && !assisting);

  const focusNode = useCallback(
    (node: number) => {
      setSeedIds([graph.nodes[node].id]);
      setDepth(1);
      frameNodes(neighbourhood(neighbours, [node], 1));
      start();
    },
    [graph, frameNodes, neighbours, start, setSeedIds],
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
      toggleSeedAt(nodeAt(toLocal(event)));
    }

    canvas.addEventListener("wheel", onWheel, { passive: false });
    if (controls) canvas.addEventListener("contextmenu", onContextMenu);
    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onContextMenu);
    };
  }, [canvasRef, toLocal, nodeAt, zoomAt, start, controls, toggleSeedAt]);

  function cancelPress() {
    clearTimeout(press.current ?? undefined);
    press.current = null;
  }

  /** Whatever the first finger began, a second one ends: the gesture is a pinch now. */
  function abandonGesture() {
    cancelPress();
    if (drag.current) {
      if (drag.current.active) {
        layout.unpin(drag.current.node);
        layout.setAlphaTarget(0);
      }
      drag.current = null;
    }
    if (panningRef.current) endPan();
  }

  function pinchState() {
    const [a, b] = [...touches.current.values()];
    return {
      distance: Math.hypot(a.x - b.x, a.y - b.y),
      centre: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  }

  function onPointerDown(event: React.PointerEvent) {
    if (event.button === 2) return;

    const point = toLocal(event);
    pointer.current = point;
    canvasRef.current?.setPointerCapture(event.pointerId);

    if (event.pointerType !== "mouse") {
      touches.current.set(event.pointerId, point);
      if (touches.current.size === 2) {
        abandonGesture();
        const { distance, centre } = pinchState();
        pinch.current = distance;
        beginPan(centre);
        return;
      }
      if (touches.current.size > 2) return;
    }

    const node = nodeAt(point);

    // No right button to press: a held finger picks a node out, or clears the focus.
    if (controls && event.pointerType !== "mouse") {
      press.current = setTimeout(() => {
        press.current = null;
        abandonGesture();
        toggleSeedAt(node);
        start();
      }, LONG_PRESS_MS);
    }

    if (node !== null) {
      drag.current = { node, moved: 0, active: false };
    } else {
      beginPan(point);
    }
  }

  function onPointerMove(event: React.PointerEvent) {
    const point = toLocal(event);
    const previous = pointer.current;
    pointer.current = point;

    if (touches.current.has(event.pointerId)) {
      touches.current.set(event.pointerId, point);
    }

    if (pinch.current !== null && touches.current.size >= 2) {
      const { distance, centre } = pinchState();
      panTo(centre);
      if (pinch.current > 0) zoomAt(centre, distance / pinch.current);
      pinch.current = distance;
      start();
      return;
    }

    if (drag.current) {
      // Not event.movement*: Safari leaves both at 0 for touch pointers.
      drag.current.moved += previous
        ? Math.hypot(point.x - previous.x, point.y - previous.y)
        : 0;
      if (drag.current.moved < CLICK_SLOP) return;
      cancelPress();
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
      if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) > 1) {
        cancelPress();
      }
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

  function onPointerUp(event?: React.PointerEvent) {
    if (event) touches.current.delete(event.pointerId);
    cancelPress();

    if (pinch.current !== null && touches.current.size < 2) {
      pinch.current = null;
      endPan();
      // A finger still down carries the pan on from wherever it is.
      const remaining = [...touches.current.values()][0];
      if (remaining) beginPan(remaining);
      start();
      return;
    }

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

  function onPointerLeave(event: React.PointerEvent) {
    onPointerUp(event);
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
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
      />

      {/* Lifts with the loader, not before it, so the mark never stands over a graph that is already up. */}
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
            <Link href={`/notes/${node.id}`}>{node.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
