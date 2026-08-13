"use client";

import { useEffect, useRef } from "react";
import {
  autocompletion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import {
  HighlightStyle,
  syntaxHighlighting,
  syntaxTree,
} from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { Compartment, EditorState, type Range } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  keymap,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { classHighlighter, tags } from "@lezer/highlight";
import { getCM, vim } from "@replit/codemirror-vim";

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

const codeLine = Decoration.line({ class: "cm-codeblock" });

function buildDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const { selection } = view.state;
  const codeLines = new Set<number>();

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        if (node.name === "FencedCode") {
          const first = view.state.doc.lineAt(node.from).number;
          const last = view.state.doc.lineAt(node.to).number;
          for (let line = first; line <= last; line++) {
            if (codeLines.has(line)) continue;
            codeLines.add(line);
            decorations.push(codeLine.range(view.state.doc.line(line).from));
          }
          return;
        }
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
        decorations.push(Decoration.replace({}).range(node.from, hideTo));
      },
    });
  }

  return Decoration.set(decorations, true);
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

/** Completes `[[` with the vault's note titles, closing the link on pick. */
function wikilinkCompletions(targets: string[]) {
  return (context: CompletionContext): CompletionResult | null => {
    const match = context.matchBefore(/\[\[([^\[\]|]*)$/);
    if (!match) return null;

    return {
      from: match.from + 2,
      options: targets.map((target) => ({
        label: target,
        apply: `${target}]]`,
      })),
      validFor: /^[^\[\]|]*$/,
    };
  };
}

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
  ".cm-line.cm-codeblock": {
    fontFamily: "var(--font-geist-mono), monospace",
    fontSize: "0.9em",
    backgroundColor: "color-mix(in srgb, var(--foreground) 6%, var(--background))",
  },
  ".cm-cursor": { borderLeftColor: "var(--accent)" },
  // Vim's statusbar lives in the app footer instead (see NoteView).
  ".cm-panels": { display: "none" },
  ".cm-tooltip": {
    backgroundColor: "var(--background)",
    color: "var(--foreground)",
    border: "1px solid color-mix(in srgb, var(--foreground) 15%, transparent)",
    borderRadius: "0.25rem",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul > li": {
    fontFamily: "inherit",
    padding: "0.25rem 0.5rem",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
    backgroundColor: "color-mix(in srgb, var(--foreground) 10%, transparent)",
    color: "var(--accent)",
  },
});

// status:true gives vim a persistent statusbar (mode, pending keys, and
// the : / search dialogs). Its DOM is retargeted into the app footer via
// cm.state.statusbar; the in-editor panel is hidden by the theme above.
const vimExtensions = [vim({ status: true })];

/** Points vim's statusbar at the app footer instead of the hidden
 * in-editor panel that created it. */
function adoptStatusBar(
  view: EditorView | null,
  bar: HTMLElement | null | undefined,
) {
  const cm = view && getCM(view);
  if (!cm || !bar) return;
  const state = cm.state as {
    statusbar?: HTMLElement;
    vimPlugin?: { updateStatus: () => void };
  };
  state.statusbar = bar;
  state.vimPlugin?.updateStatus();
}

export function MarkdownEditor({
  initialBody,
  onChange,
  linkTargets = [],
  vimMode = false,
  vimStatusBar,
}: {
  initialBody: string;
  onChange: (body: string) => void;
  /** Note titles offered by the `[[` autocomplete. */
  linkTargets?: string[];
  vimMode?: boolean;
  /** Host element for vim's statusbar (mode, keys, : dialog). */
  vimStatusBar?: () => HTMLElement | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialRef = useRef(initialBody);
  const targetsRef = useRef(linkTargets);
  const onChangeRef = useRef(onChange);
  const statusBarRef = useRef(vimStatusBar);
  const viewRef = useRef<EditorView | null>(null);
  const vimCompartmentRef = useRef<Compartment | null>(null);
  const initialVimRef = useRef(vimMode);

  useEffect(() => {
    onChangeRef.current = onChange;
    statusBarRef.current = vimStatusBar;
  });

  // Toggling the setting reconfigures a live editor in place.
  useEffect(() => {
    if (viewRef.current && vimCompartmentRef.current) {
      viewRef.current.dispatch({
        effects: vimCompartmentRef.current.reconfigure(
          vimMode ? vimExtensions : [],
        ),
      });
      if (vimMode) adoptStatusBar(viewRef.current, statusBarRef.current?.());
    }
  }, [vimMode]);

  useEffect(() => {
    const vimCompartment = new Compartment();
    vimCompartmentRef.current = vimCompartment;

    const view = new EditorView({
      state: EditorState.create({
        doc: initialRef.current,
        extensions: [
          // Vim must precede the other keymaps to claim keys first.
          vimCompartment.of(initialVimRef.current ? vimExtensions : []),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          autocompletion({
            override: [wikilinkCompletions(targetsRef.current)],
          }),
          EditorView.lineWrapping,
          syntaxHighlighting(markdownHighlight),
          // tok-* classes; colored in globals.css, shared with reading view.
          syntaxHighlighting(classHighlighter),
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
    viewRef.current = view;
    view.focus();
    if (initialVimRef.current) {
      adoptStatusBar(view, statusBarRef.current?.());
    }

    return () => {
      viewRef.current = null;
      view.destroy();
    };
  }, []);

  return <div ref={containerRef} className="min-h-[50vh]" />;
}
