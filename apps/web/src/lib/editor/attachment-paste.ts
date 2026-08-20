"use client";

import { EditorView } from "@codemirror/view";
import { uploadImage } from "../attachments";

function imageFiles(transfer: DataTransfer | null): File[] {
  return Array.from(transfer?.files ?? []).filter((file) =>
    file.type.startsWith("image/"),
  );
}

async function insertUploads(
  view: EditorView,
  files: File[],
  at: number,
): Promise<void> {
  const links: string[] = [];
  for (const file of files) {
    const { name, error } = await uploadImage(file);
    if (error || !name) {
      if (error) alert(error);
      continue;
    }
    links.push(`![[${name}]]`);
  }
  if (links.length === 0) return;

  const text = links.join("\n");
  view.dispatch({
    changes: { from: at, insert: text },
    selection: { anchor: at + text.length },
  });
  view.focus();
}

export const attachmentPaste = EditorView.domEventHandlers({
  paste: (event, view) => {
    const files = imageFiles(event.clipboardData);
    if (files.length === 0) return false;
    event.preventDefault();
    void insertUploads(view, files, view.state.selection.main.head);
    return true;
  },
  drop: (event, view) => {
    const files = imageFiles(event.dataTransfer);
    if (files.length === 0) return false;
    event.preventDefault();
    const at =
      view.posAtCoords({ x: event.clientX, y: event.clientY }) ??
      view.state.selection.main.head;
    void insertUploads(view, files, at);
    return true;
  },
});
