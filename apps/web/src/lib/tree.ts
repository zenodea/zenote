type TreeNote = { slug: string; title: string; drawing?: boolean };

export type TreeNode =
  | { kind: "folder"; name: string; path: string; children: TreeNode[] }
  | { kind: "note"; name: string; slug: string; drawing?: boolean };

type FolderDraft = {
  children: Map<string, FolderDraft | TreeNote>;
};

export function buildTree(
  notes: TreeNote[],
  folders: string[] = [],
): TreeNode[] {
  const root: FolderDraft = { children: new Map() };

  function ensureFolder(segments: string[]): FolderDraft {
    let cursor = root;
    for (const segment of segments) {
      let next = cursor.children.get(segment);
      if (!next || !isFolder(next)) {
        next = { children: new Map() };
        cursor.children.set(segment, next);
      }
      cursor = next;
    }
    return cursor;
  }

  for (const folder of folders) {
    ensureFolder(folder.split("/"));
  }

  for (const note of notes) {
    const segments = note.slug.split("/");
    const filename = segments.pop()!;
    ensureFolder(segments).children.set(filename, note);
  }

  return toNodes(root, "");
}

function isFolder(value: FolderDraft | TreeNote): value is FolderDraft {
  return "children" in value;
}

function toNodes(folder: FolderDraft, prefix: string): TreeNode[] {
  const nodes = [...folder.children.entries()].map(
    ([name, value]): TreeNode => {
      const path = prefix ? `${prefix}/${name}` : name;

      return isFolder(value)
        ? { kind: "folder", name, path, children: toNodes(value, path) }
        : {
            kind: "note",
            name: value.title,
            slug: value.slug,
            drawing: value.drawing,
          };
    },
  );

  return nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
