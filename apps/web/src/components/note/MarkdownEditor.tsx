"use client";

import { useCallback, useEffect, useRef } from "react";
import { autocompletion } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { syntaxHighlighting } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { classHighlighter } from "@lezer/highlight";
import { markdownHighlight } from "@/lib/editor/highlight";
import { livePreview } from "@/lib/editor/live-preview";
import { editorTheme } from "@/lib/editor/theme";
import { adoptStatusBar, vimExtensions } from "@/lib/editor/vim";
import { wikilinkCompletions } from "@/lib/editor/wikilink-completion";
import { useLatestRef } from "@/hooks/use-latest-ref";

const CARET_MARGIN = 24;

export function MarkdownEditor({
  initialBody,
  onChange,
  linkTargets = [],
  vimMode = false,
  vimStatusBar,
}: {
  initialBody: string;
  onChange: (body: string) => void;
  linkTargets?: string[];
  vimMode?: boolean;
  vimStatusBar?: () => HTMLElement | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialRef = useRef(initialBody);
  const targetsRef = useRef(linkTargets);
  const initialVimRef = useRef(vimMode);
  const onChangeRef = useLatestRef(onChange);
  const statusBarRef = useLatestRef(vimStatusBar);
  const viewRef = useRef<EditorView | null>(null);
  const vimCompartmentRef = useRef<Compartment | null>(null);
  const adoptFrame = useRef(0);

  const adoptWhenHosted = useCallback(
    (view: EditorView) => {
      cancelAnimationFrame(adoptFrame.current);
      if (adoptStatusBar(view, statusBarRef.current?.())) return;
      adoptFrame.current = requestAnimationFrame(() => {
        adoptStatusBar(view, statusBarRef.current?.());
      });
    },
    [statusBarRef],
  );

  useEffect(() => () => cancelAnimationFrame(adoptFrame.current), []);

  useEffect(() => {
    if (!viewRef.current || !vimCompartmentRef.current) return;
    viewRef.current.dispatch({
      effects: vimCompartmentRef.current.reconfigure(
        vimMode ? vimExtensions : [],
      ),
    });
    if (vimMode) adoptWhenHosted(viewRef.current);
  }, [vimMode, adoptWhenHosted]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    let frame = 0;

    function measure() {
      const view = viewRef.current;
      if (!view?.hasFocus) return;

      const head = view.state.selection.main.head;
      const caret = view.coordsAtPos(head);
      if (!caret) return;

      const top = viewport!.offsetTop;
      const bottom = top + viewport!.height;
      if (caret.top >= top + CARET_MARGIN && caret.bottom <= bottom - CARET_MARGIN) {
        return;
      }

      const inset = Math.max(0, window.innerHeight - bottom);
      view.dispatch({
        effects: EditorView.scrollIntoView(head, {
          y: "nearest",
          yMargin: inset + CARET_MARGIN,
        }),
      });
    }

    function reveal() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    }

    viewport.addEventListener("resize", reveal);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", reveal);
    };
  }, []);

  useEffect(() => {
    const vimCompartment = new Compartment();
    vimCompartmentRef.current = vimCompartment;

    const view = new EditorView({
      state: EditorState.create({
        doc: initialRef.current,
        extensions: [
          vimCompartment.of(initialVimRef.current ? vimExtensions : []),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          autocompletion({
            override: [wikilinkCompletions(targetsRef.current)],
          }),
          EditorView.lineWrapping,
          syntaxHighlighting(markdownHighlight),
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
    if (initialVimRef.current) adoptWhenHosted(view);

    return () => {
      viewRef.current = null;
      view.destroy();
    };
  }, [onChangeRef, adoptWhenHosted]);

  return <div ref={containerRef} className="min-h-[50dvh]" />;
}
