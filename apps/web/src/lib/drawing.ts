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
