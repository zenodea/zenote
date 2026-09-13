import { syntaxTree } from "@codemirror/language";
import {
  Facet,
  StateField,
  type EditorState,
  type Range,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { navigate } from "@/lib/navigation";
import { tagRegex } from "@/lib/tags";
import { todoRegex } from "@/lib/todos";
import {
  isImageName,
  resolveWikilink,
  wikilinkRegex,
  type WikilinkResolver,
} from "@/lib/wikilinks";
import {
  ImageWidget,
  MathWidget,
  RuleWidget,
  TableWidget,
  TodoWidget,
} from "./preview-widgets";

export const previewResolver = Facet.define<WikilinkResolver, WikilinkResolver>(
  { combine: (values) => values[0] ?? new Map() },
);

const HIDDEN_MARKS = new Set([
  "HeaderMark",
  "EmphasisMark",
  "StrikethroughMark",
  "CodeMark",
  "LinkMark",
  "QuoteMark",
  "URL",
]);

const BLOCK_NODES = new Set(["Table", "HorizontalRule"]);

const IMAGE = /^!\[([^\]]*)\]\(([^()\s]*)\)$/;
const EMBED = /!\[\[([^[\]]+)\]\]/g;
const DISPLAY_MATH = /\$\$([^$]+?)\$\$/g;
const INLINE_MATH = /\$(?!\s)([^$\n]+?)(?<!\s)\$/g;

const hide = Decoration.replace({});
const quoteLine = Decoration.line({ class: "cm-quote" });
const listLine = Decoration.line({ class: "cm-list" });
const doneMark = Decoration.mark({ class: "cm-todo-done" });
const tagMark = Decoration.mark({ class: "tag" });

type Span = { from: number; to: number };

function hits(spans: Span[], from: number, to: number): boolean {
  return spans.some((span) => from < span.to && to > span.from);
}

function touches(state: EditorState, from: number, to: number): boolean {
  return state.selection.ranges.some(
    (range) => range.from <= to && range.to >= from,
  );
}

function lineClasses(
  state: EditorState,
  from: number,
  to: number,
  decoration: Decoration,
  into: Range<Decoration>[],
) {
  const first = state.doc.lineAt(from).number;
  const last = state.doc.lineAt(to).number;
  for (let line = first; line <= last; line += 1) {
    into.push(decoration.range(state.doc.line(line).from));
  }
}

function buildBlocks(state: EditorState): DecorationSet {
  const resolver = state.facet(previewResolver);
  const blocks: Range<Decoration>[] = [];

  syntaxTree(state).iterate({
    from: 0,
    to: state.doc.length,
    enter: (node) => {
      if (!BLOCK_NODES.has(node.name)) return undefined;

      const first = state.doc.lineAt(node.from);
      const last = state.doc.lineAt(node.to);
      if (touches(state, first.from, last.to) || first.from === last.to) {
        return false;
      }

      const widget =
        node.name === "Table"
          ? new TableWidget(state.sliceDoc(first.from, last.to), resolver)
          : new RuleWidget();

      blocks.push(
        Decoration.replace({ widget, block: true }).range(first.from, last.to),
      );
      return false;
    },
  });

  return Decoration.set(blocks, true);
}

export const previewBlocks = StateField.define<DecorationSet>({
  create: (state) => buildBlocks(state),
  update: (value, tr) =>
    tr.docChanged ||
    tr.selection !== undefined ||
    syntaxTree(tr.state).length !== syntaxTree(tr.startState).length
      ? buildBlocks(tr.state)
      : value,
  provide: (field) => EditorView.decorations.from(field),
});

function collectOpaque(view: EditorView, into: Span[]) {
  const { state } = view;

  for (const visible of view.visibleRanges) {
    syntaxTree(state).iterate({
      from: visible.from,
      to: visible.to,
      enter: (node) => {
        if (node.name === "InlineCode") {
          into.push({ from: node.from, to: node.to });
          return false;
        }
        if (node.name === "FencedCode" || BLOCK_NODES.has(node.name)) {
          const first = state.doc.lineAt(node.from);
          const last = state.doc.lineAt(node.to);
          into.push({ from: first.from, to: last.to });
          return false;
        }
        return undefined;
      },
    });
  }
}

function collectText(
  view: EditorView,
  opaque: Span[],
  claimed: Span[],
  into: Range<Decoration>[],
) {
  const { state } = view;
  const resolver = state.facet(previewResolver);

  const claim = (from: number, to: number): boolean => {
    if (hits(opaque, from, to) || hits(claimed, from, to)) return false;
    claimed.push({ from, to });
    return true;
  };

  for (const visible of view.visibleRanges) {
    const text = state.sliceDoc(visible.from, visible.to);
    const base = visible.from;

    for (const match of text.matchAll(EMBED)) {
      const from = base + (match.index ?? 0);
      const to = from + match[0].length;
      const name = match[1].trim();
      if (!isImageName(name) || !claim(from, to)) continue;
      if (touches(state, from, to)) continue;
      into.push(
        Decoration.replace({
          widget: new ImageWidget(name, name, true),
        }).range(from, to),
      );
    }

    for (const match of text.matchAll(todoRegex())) {
      const from = base + (match.index ?? 0);
      const to = from + match[0].length;
      if (!claim(from, to)) continue;

      if (touches(state, from, to)) {
        if (match[1] === "x") into.push(doneMark.range(from, to));
        continue;
      }
      into.push(
        Decoration.replace({
          widget: new TodoWidget(
            match[1] === "x",
            match[2].trim(),
            match[3]?.trim() || null,
          ),
        }).range(from, to),
      );
    }

    for (const match of text.matchAll(wikilinkRegex())) {
      const from = base + (match.index ?? 0);
      const to = from + match[0].length;
      if (!claim(from, to)) continue;
      if (touches(state, from, to)) continue;

      const [, target, heading, alias] = match;
      const labelFrom = alias
        ? from + 2 + target.length + (heading ? heading.length + 1 : 0) + 1
        : from + 2;
      const labelTo = labelFrom + (alias ?? target).length;

      const slug = resolveWikilink(resolver, target);
      const mark =
        slug === null
          ? Decoration.mark({
              class: "wikilink-broken",
              attributes: { title: `No note found for "${target.trim()}"` },
            })
          : Decoration.mark({
              class: "cm-wikilink",
              attributes: { "data-href": `/notes/${slug}` },
            });

      into.push(hide.range(from, labelFrom));
      if (labelTo > labelFrom) into.push(mark.range(labelFrom, labelTo));
      into.push(hide.range(labelTo, to));
    }

    for (const match of text.matchAll(DISPLAY_MATH)) {
      const from = base + (match.index ?? 0);
      const to = from + match[0].length;
      if (!claim(from, to) || touches(state, from, to)) continue;
      into.push(
        Decoration.replace({
          widget: new MathWidget(match[1], true),
        }).range(from, to),
      );
    }

    for (const match of text.matchAll(INLINE_MATH)) {
      const from = base + (match.index ?? 0);
      const to = from + match[0].length;
      if (!claim(from, to) || touches(state, from, to)) continue;
      into.push(
        Decoration.replace({
          widget: new MathWidget(match[1], false),
        }).range(from, to),
      );
    }

    for (const match of text.matchAll(tagRegex())) {
      const at = match.index ?? 0;
      if (text.slice(Math.max(0, at - 2), at) === "](") continue;

      const from = base + at;
      const to = from + match[0].length;
      if (!claim(from, to)) continue;
      into.push(tagMark.range(from, to));
    }
  }
}

function collectSyntax(
  view: EditorView,
  claimed: Span[],
  into: Range<Decoration>[],
) {
  const { state } = view;
  const seen = new Set<number>();

  for (const visible of view.visibleRanges) {
    syntaxTree(state).iterate({
      from: visible.from,
      to: visible.to,
      enter: (node) => {
        if (BLOCK_NODES.has(node.name)) return false;

        if (node.name === "FencedCode") {
          const first = state.doc.lineAt(node.from).number;
          const last = state.doc.lineAt(node.to).number;
          for (let line = first; line <= last; line += 1) {
            const classes = ["cm-codeblock"];
            if (line === first) classes.push("cm-codeblock-open");
            if (line === last) classes.push("cm-codeblock-close");
            into.push(
              Decoration.line({ class: classes.join(" ") }).range(
                state.doc.line(line).from,
              ),
            );
          }
          return undefined;
        }

        if (node.name === "Blockquote") {
          lineClasses(state, node.from, node.to, quoteLine, into);
          return undefined;
        }

        if (node.name === "ListItem") {
          lineClasses(state, node.from, node.to, listLine, into);
          return undefined;
        }

        if (hits(claimed, node.from, node.to)) return undefined;

        if (node.name === "Image") {
          if (seen.has(node.from)) return false;
          seen.add(node.from);

          const parts = IMAGE.exec(state.sliceDoc(node.from, node.to));
          if (!parts) return undefined;
          if (touches(state, node.from, node.to)) return false;

          into.push(
            Decoration.replace({
              widget: new ImageWidget(parts[2], parts[1], false),
            }).range(node.from, node.to),
          );
          return false;
        }

        if (!HIDDEN_MARKS.has(node.name)) return undefined;

        const parent = node.node.parent;
        const extentFrom = parent?.from ?? node.from;
        const extentTo = parent?.to ?? node.to;
        if (touches(state, extentFrom, extentTo)) return undefined;
        if (
          node.name === "URL" &&
          state.sliceDoc(extentFrom, extentFrom + 1) !== "["
        ) {
          return undefined;
        }

        let hideTo = node.to;
        if (
          (node.name === "HeaderMark" || node.name === "QuoteMark") &&
          state.sliceDoc(hideTo, hideTo + 1) === " "
        ) {
          hideTo += 1;
        }
        if (hideTo > node.from) into.push(hide.range(node.from, hideTo));
        return undefined;
      },
    });
  }
}

function buildDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const opaque: Span[] = [];
  const claimed: Span[] = [];

  collectOpaque(view, opaque);
  collectText(view, opaque, claimed, decorations);
  collectSyntax(view, claimed, decorations);

  return Decoration.set(decorations, true);
}

export const previewLinks = EditorView.domEventHandlers({
  mousedown: (event) => {
    if (!event.metaKey && !event.ctrlKey) return false;

    const target = event.target as HTMLElement | null;
    const href = target?.closest?.("[data-href]")?.getAttribute("data-href");
    if (!href) return false;

    event.preventDefault();
    if (href.startsWith("/")) navigate(href);
    else window.open(href, "_blank", "noopener");
    return true;
  },
});

export const livePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    parsed: number;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
      this.parsed = syntaxTree(view.state).length;
    }

    update(update: ViewUpdate) {
      const parsed = syntaxTree(update.state).length;
      const grew = parsed > this.parsed;
      this.parsed = parsed;

      if (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged ||
        grew
      ) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);
