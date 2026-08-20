import {
  Application,
  BitmapText,
  Container,
  Graphics,
  Sprite,
  type Texture,
} from "pixi.js";
import type { GraphNode } from "@/lib/graph/model";
import { nodeRadius, type View } from "@/lib/graph/geometry";

export type Palette = {
  foreground: string;
  background: string;
  accent: string;
};

const EDGE_ALPHA = 0.28;
const EDGE_FOCUS_DROP = 0.22;
const LABEL_SCALE = 2.0;
const LABEL_HUB_SCALE = 0.8;
const LABEL_FADE = 0.2;
const NODE_TEXTURE_RADIUS = 32;
const REGION_FADE_OUT = 1.4;

export type SceneFrame = {
  x: Float64Array;
  y: Float64Array;
  view: View;
  fitScale: number;
  highlight: Float32Array;
  labelFocus: Float32Array;
  focusAmount: number;
  near: Set<number> | null;
  seeds: number[];
  visible: Set<number> | null;
  positionsDirty: boolean;
};

export class PixiScene {
  private app: Application;
  private world = new Container();
  private edges = new Graphics();
  private focusEdges = new Graphics();
  private nodeLayer = new Container();
  private labelLayer = new Container();
  private regionLayer = new Container();
  private rings = new Graphics();

  private nodes: GraphNode[] = [];
  private edgePairs: ReadonlyArray<readonly [number, number]> = [];
  private radii: number[] = [];
  private sprites: Sprite[] = [];
  private labels: BitmapText[] = [];
  private regions: { label: BitmapText; nodes: number[] }[] = [];
  private circle: Texture | null = null;
  private square: Texture | null = null;
  private palette: Palette;
  private lastVisible: Set<number> | null | undefined = undefined;
  private edgesBuilt = false;

  private constructor(app: Application, palette: Palette) {
    this.app = app;
    this.palette = palette;
    this.world.addChild(
      this.edges,
      this.focusEdges,
      this.nodeLayer,
      this.labelLayer,
    );
    this.app.stage.addChild(this.world, this.rings);
  }

  static async create(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    palette: Palette,
  ): Promise<PixiScene> {
    const app = new Application();
    await app.init({
      canvas,
      width,
      height,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      background: palette.background,
      autoStart: false,
      preference: "webgl",
    });
    return new PixiScene(app, palette);
  }

  setGraph(
    nodes: GraphNode[],
    edgePairs: ReadonlyArray<readonly [number, number]>,
    baseRadius: number,
  ) {
    for (const sprite of this.sprites) sprite.destroy();
    for (const label of this.labels) label.destroy();
    this.sprites = [];
    this.labels = [];
    this.edges.clear();
    this.focusEdges.clear();
    this.rings.clear();
    this.edgesBuilt = false;
    this.lastVisible = undefined;

    this.nodes = nodes;
    this.edgePairs = edgePairs;
    this.radii = nodes.map((node) => nodeRadius(node.degree, baseRadius));

    let circle = this.circle;
    if (!circle) {
      const disc = new Graphics()
        .circle(0, 0, NODE_TEXTURE_RADIUS)
        .fill(0xffffff);
      circle = this.app.renderer.generateTexture({
        target: disc,
        resolution: 2,
      });
      disc.destroy();
      this.circle = circle;
    }

    let square = this.square;
    if (!square) {
      // Same area as the disc, so both shapes carry equal visual weight.
      const half = NODE_TEXTURE_RADIUS * Math.sqrt(Math.PI) * 0.5;
      const box = new Graphics()
        .rect(-half, -half, half * 2, half * 2)
        .fill(0xffffff);
      square = this.app.renderer.generateTexture({
        target: box,
        resolution: 2,
      });
      box.destroy();
      this.square = square;
    }

    for (const node of nodes) {
      const sprite = new Sprite(node.drawing ? square : circle);
      sprite.anchor.set(0.5);
      sprite.tint =
        node.degree === 0 ? this.palette.foreground : this.palette.accent;
      this.nodeLayer.addChild(sprite);
      this.sprites.push(sprite);

      const label = new BitmapText({
        text: node.title,
        style: { fontFamily: "system-ui", fontSize: 11, fill: 0xffffff },
      });
      label.anchor.set(0.5, 0);
      label.tint = this.palette.foreground;
      label.visible = false;
      this.labelLayer.addChild(label);
      this.labels.push(label);
    }
  }

  setRegions(regions: { name: string; nodes: number[] }[]) {
    for (const region of this.regions) region.label.destroy();
    this.regions = regions.map(({ name, nodes }) => {
      const label = new BitmapText({
        text: name.toUpperCase(),
        style: { fontFamily: "system-ui", fontSize: 13, fill: 0xffffff },
      });
      label.anchor.set(0.5);
      label.tint = this.palette.foreground;
      label.visible = false;
      this.regionLayer.addChild(label);
      return { label, nodes };
    });
  }

  setPalette(palette: Palette) {
    this.palette = palette;
    this.app.renderer.background.color = palette.background;
    this.edges.tint = palette.foreground;
    this.focusEdges.tint = palette.foreground;
    for (const region of this.regions) region.label.tint = palette.foreground;
    for (let i = 0; i < this.sprites.length; i++) {
      this.sprites[i].tint =
        this.nodes[i].degree === 0 ? palette.foreground : palette.accent;
      this.labels[i].tint = palette.foreground;
    }
  }

  resize(width: number, height: number) {
    this.app.renderer.resize(width, height);
  }

  update(frame: SceneFrame) {
    const {
      x,
      y,
      view,
      fitScale,
      highlight,
      labelFocus,
      focusAmount,
      near,
      seeds,
      visible,
      positionsDirty,
    } = frame;
    const { scale } = view;
    const shown = (i: number) => visible === null || visible.has(i);

    this.world.position.set(view.x, view.y);
    this.world.scale.set(scale);

    const visibleChanged = visible !== this.lastVisible;
    this.lastVisible = visible;

    if (positionsDirty || visibleChanged || !this.edgesBuilt) {
      this.edges.clear();
      for (const [a, b] of this.edgePairs) {
        if (!shown(a) || !shown(b)) continue;
        this.edges.moveTo(x[a], y[a]).lineTo(x[b], y[b]);
      }
      this.edges.stroke({ width: 1, color: 0xffffff, pixelLine: true });
      this.edges.tint = this.palette.foreground;
      this.edgesBuilt = true;
    }
    this.edges.alpha = EDGE_ALPHA - EDGE_FOCUS_DROP * focusAmount;

    this.focusEdges.clear();
    if (focusAmount > 0.01 && near !== null) {
      for (const [a, b] of this.edgePairs) {
        if (!near.has(a) && !near.has(b)) continue;
        if (!shown(a) || !shown(b)) continue;
        const level = Math.min(highlight[a], highlight[b]);
        if (level < 0.02) continue;
        this.focusEdges
          .moveTo(x[a], y[a])
          .lineTo(x[b], y[b])
          .stroke({
            width: 1,
            color: 0xffffff,
            alpha: 0.75 * level * focusAmount,
            pixelLine: true,
          });
      }
      this.focusEdges.tint = this.palette.foreground;
    }

    const relativeScale = scale / Math.max(fitScale, 1e-6);
    const spriteScale = 2 / (NODE_TEXTURE_RADIUS * 2) / scale;

    for (let i = 0; i < this.nodes.length; i++) {
      const sprite = this.sprites[i];
      const label = this.labels[i];
      const isShown = shown(i);
      sprite.visible = isShown;
      if (!isShown) {
        label.visible = false;
        continue;
      }

      const radius = this.radii[i];
      sprite.position.set(x[i], y[i]);
      sprite.scale.set(radius * spriteScale);
      const isolated = this.nodes[i].degree === 0;
      sprite.alpha = (0.15 + 0.85 * highlight[i]) * (isolated ? 0.55 : 1);

      const importance = Math.min(this.nodes[i].degree, 8) / 8;
      const startAt =
        LABEL_SCALE - (LABEL_SCALE - LABEL_HUB_SCALE) * importance * importance;
      const zoomAlpha = Math.min(
        1,
        Math.max(0, (relativeScale - startAt) / LABEL_FADE),
      );
      const alpha = Math.max(labelFocus[i], zoomAlpha * (1 - focusAmount));

      if (alpha < 0.02) {
        label.visible = false;
      } else {
        label.visible = true;
        label.alpha = alpha;
        label.position.set(x[i], y[i] + (radius + 3) / scale);
        label.scale.set(1 / scale);
      }
    }

    const regionAlpha =
      Math.max(0, 1 - relativeScale / REGION_FADE_OUT) * (1 - focusAmount);
    for (const { label, nodes: members } of this.regions) {
      if (regionAlpha < 0.02) {
        label.visible = false;
        continue;
      }

      let sumX = 0;
      let sumY = 0;
      let seen = 0;
      for (const i of members) {
        if (!shown(i)) continue;
        sumX += x[i];
        sumY += y[i];
        seen++;
      }
      if (seen === 0) {
        label.visible = false;
        continue;
      }

      label.visible = true;
      label.alpha = regionAlpha * 0.55;
      label.position.set(sumX / seen, sumY / seen);
      label.scale.set(1 / scale);
    }

    this.rings.clear();
    if (seeds.length > 0 && focusAmount > 0.01) {
      for (const seed of seeds) {
        this.rings.circle(
          x[seed] * scale + view.x,
          y[seed] * scale + view.y,
          this.radii[seed] + 5,
        );
      }
      this.rings.stroke({
        width: 1.5,
        color: this.palette.accent,
        alpha: focusAmount,
      });
    }
  }

  render() {
    this.app.render();
  }

  destroy() {
    this.app.destroy({ removeView: false }, { children: true, texture: true });
    this.circle?.destroy(true);
    this.square?.destroy(true);
  }
}
