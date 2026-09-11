export type ExcalidrawModule = typeof import("@excalidraw/excalidraw");
export type ExcalidrawProps = Parameters<ExcalidrawModule["Excalidraw"]>[0];
export type ExcalidrawImperativeAPI = Parameters<
  NonNullable<ExcalidrawProps["excalidrawAPI"]>
>[0];
export type SceneElements = NonNullable<
  Parameters<ExcalidrawImperativeAPI["updateScene"]>[0]["elements"]
>;
