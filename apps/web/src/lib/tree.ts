import type { Note } from "./notes";

export type TreeNode =
  | { kind: "folder"; name: string; path: string; children: TreeNode[] }
  | { kind: "note"; name: string; slug: string };

type FolderDraft = {
  children: Map<string, FolderDraft | Note>;
};

export function buildTree(notes: Note[]): TreeNode[] {
  const root: FolderDraft = { children: new Map() };

  for (const note of notes) {
    const segments = note.slug.split("/");
    const filename = segments.pop()!;

    let cursor = root;
    for (const segment of segments) {
      let next = cursor.children.get(segment);
      if (!next || !isFolder(next)) {
        next = { children: new Map() };
        cursor.children.set(segment, next);
      }
      cursor = next;
    }

    cursor.children.set(filename, note);
  }

  return toNodes(root, "");
}

function isFolder(value: FolderDraft | Note): value is FolderDraft {
  return "children" in value;
}

function toNodes(folder: FolderDraft, prefix: string): TreeNode[] {
  const nodes = [...folder.children.entries()].map(
    ([name, value]): TreeNode => {
      const path = prefix ? `${prefix}/${name}` : name;

      return isFolder(value)
        ? { kind: "folder", name, path, children: toNodes(value, path) }
        : { kind: "note", name: value.title, slug: value.slug };
    },
  );

  // Folders above notes, each group alphabetical.
  return nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
