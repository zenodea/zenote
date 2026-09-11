const FENCE = /^\s*```excalidraw\r?\n([\s\S]*?)\r?\n```\s*$/;

export function drawingScene(body: string): string | null {
  return body.match(FENCE)?.[1] ?? null;
}

export function drawingBody(scene: string): string {
  return `\`\`\`excalidraw\n${scene}\n\`\`\`\n`;
}

export const EMPTY_SCENE = JSON.stringify(
  {
    type: "excalidraw",
    version: 2,
    source: "zenote",
    elements: [],
    appState: { viewBackgroundColor: "transparent" },
    files: {},
  },
  null,
  2,
);

export type ParsedScene = {
  elements: Record<string, unknown>[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
  skeleton: boolean;
};

export function parseScene(raw: string): ParsedScene | null {
  try {
    const scene = JSON.parse(raw) as Record<string, unknown>;
    const elements = Array.isArray(scene.elements)
      ? (scene.elements as Record<string, unknown>[])
      : Array.isArray(scene)
        ? (scene as unknown as Record<string, unknown>[])
        : null;
    if (!elements) return null;

    return {
      elements,
      appState:
        typeof scene.appState === "object" && scene.appState !== null
          ? (scene.appState as Record<string, unknown>)
          : {},
      files:
        typeof scene.files === "object" && scene.files !== null
          ? (scene.files as Record<string, unknown>)
          : {},
      skeleton: elements.some((element) => !("seed" in element)),
    };
  } catch {
    return null;
  }
}

export function sceneTextLines(scene: string): string[] {
  const parsed = parseScene(scene);
  if (!parsed) return [];

  return parsed.elements.flatMap((element) =>
    element.type === "text" && typeof element.text === "string"
      ? element.text.split("\n")
      : [],
  );
}

export function mapSceneText(
  scene: string,
  rewrite: (text: string) => string,
): string {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(scene) as Record<string, unknown>;
  } catch {
    return scene;
  }
  if (!Array.isArray(parsed.elements)) return scene;

  let changed = false;
  const elements = (parsed.elements as Record<string, unknown>[]).map(
    (element) => {
      if (element.type !== "text" || typeof element.text !== "string") {
        return element;
      }
      const text = rewrite(element.text);
      const original =
        typeof element.originalText === "string"
          ? rewrite(element.originalText)
          : element.originalText;
      if (text === element.text && original === element.originalText) {
        return element;
      }
      changed = true;
      return { ...element, text, originalText: original };
    },
  );

  return changed ? JSON.stringify({ ...parsed, elements }, null, 2) : scene;
}
