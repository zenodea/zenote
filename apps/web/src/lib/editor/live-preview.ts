import { syntaxTree } from "@codemirror/language";
import type { Range } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";

const HIDDEN_MARKS = new Set([
  "HeaderMark",
  "EmphasisMark",
  "StrikethroughMark",
  "CodeMark",
  "LinkMark",
  "URL",
]);

const codeLine = Decoration.line({ class: "cm-codeblock" });

// Whole doc on purpose: these change line heights, so viewport-scoped ones shift layout on scroll.
function buildDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const { selection } = view.state;

  syntaxTree(view.state).iterate({
    from: 0,
    to: view.state.doc.length,
    enter: (node) => {
      if (node.name === "FencedCode") {
        const first = view.state.doc.lineAt(node.from).number;
        const last = view.state.doc.lineAt(node.to).number;
        for (let line = first; line <= last; line++) {
          decorations.push(codeLine.range(view.state.doc.line(line).from));
        }
        return;
      }
      if (!HIDDEN_MARKS.has(node.name)) return;

      const parent = node.node.parent;
      const extentFrom = parent?.from ?? node.from;
      const extentTo = parent?.to ?? node.to;
      const cursorInside = selection.ranges.some(
        (range) => range.from <= extentTo && range.to >= extentFrom,
      );
      if (cursorInside) return;

      let hideTo = node.to;
      if (
        node.name === "HeaderMark" &&
        view.state.sliceDoc(hideTo, hideTo + 1) === " "
      ) {
        hideTo += 1;
      }
      decorations.push(Decoration.replace({}).range(node.from, hideTo));
    },
  });

  return Decoration.set(decorations, true);
}

/** Hides markdown syntax marks unless the cursor is inside their construct. */
export const livePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);
