"use client";

import { useEffect, useRef } from "react";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import {
  HighlightStyle,
  syntaxHighlighting,
  syntaxTree,
} from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { EditorState, RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  keymap,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";

/**
 * Obsidian-style live preview: one continuous editable plane where
 * markdown is styled inline and the syntax marks (#, **, `, link parens)
 * are hidden unless the cursor is inside the construct they belong to.
 */

// Node names of syntax marks worth hiding when the cursor is elsewhere.
const HIDDEN_MARKS = new Set([
  "HeaderMark",
  "EmphasisMark",
  "StrikethroughMark",
  "CodeMark",
  "LinkMark",
  "URL",
]);

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const { selection } = view.state;

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        if (!HIDDEN_MARKS.has(node.name)) return;

        // Reveal the marks while the cursor touches their construct.
        const parent = node.node.parent;
        const extentFrom = parent?.from ?? node.from;
        const extentTo = parent?.to ?? node.to;
        const active = selection.ranges.some(
          (range) => range.from <= extentTo && range.to >= extentFrom,
        );
        if (active) return;

        // A heading's mark swallows its following space too.
        let hideTo = node.to;
        if (
          node.name === "HeaderMark" &&
          view.state.sliceDoc(hideTo, hideTo + 1) === " "
        ) {
          hideTo += 1;
        }
        builder.add(node.from, hideTo, Decoration.replace({}));
      },
    });
  }

  return builder.finish();
}

const livePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged
      ) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

const markdownHighlight = HighlightStyle.define([
  { tag: tags.heading1, fontSize: "1.875em", fontWeight: "700" },
  { tag: tags.heading2, fontSize: "1.5em", fontWeight: "700" },
  { tag: tags.heading3, fontSize: "1.25em", fontWeight: "600" },
  { tag: tags.heading4, fontSize: "1.1em", fontWeight: "600" },
  { tag: tags.heading5, fontWeight: "600" },
  { tag: tags.heading6, fontWeight: "600", opacity: "0.8" },
  { tag: tags.strong, fontWeight: "600" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  {
    tag: tags.link,
    color: "var(--accent)",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
  },
  { tag: tags.url, color: "var(--accent)", opacity: "0.7" },
  {
    tag: tags.monospace,
    fontFamily: "var(--font-geist-mono), monospace",
    fontSize: "0.9em",
  },
  { tag: tags.quote, fontStyle: "italic", opacity: "0.8" },
  // Syntax marks, when revealed by the cursor, stay unobtrusive.
  { tag: tags.processingInstruction, opacity: "0.45" },
  { tag: tags.meta, opacity: "0.45" },
]);

const editorTheme = EditorView.theme({
  "&": { backgroundColor: "transparent", fontSize: "1rem" },
  "&.cm-focused": { outline: "none" },
  // CodeMirror's base theme puts `monospace` on .cm-scroller; override
  // there, or .cm-content's `inherit` picks the monospace up.
  ".cm-scroller": { fontFamily: "inherit", lineHeight: "1.75" },
  ".cm-content": {
    padding: "0",
    caretColor: "var(--accent)",
  },
  ".cm-line": { padding: "0" },
  ".cm-cursor": { borderLeftColor: "var(--accent)" },
});

export function MarkdownEditor({
  initialBody,
  onChange,
}: {
  initialBody: string;
  onChange: (body: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialRef = useRef(initialBody);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    const view = new EditorView({
      state: EditorState.create({
        doc: initialRef.current,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          EditorView.lineWrapping,
          syntaxHighlighting(markdownHighlight),
          livePreview,
          editorTheme,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
        ],
      }),
      parent: containerRef.current!,
    });
    view.focus();
    return () => view.destroy();
  }, []);

  return <div ref={containerRef} className="min-h-[50vh]" />;
}
