"use client";

import { useEffect, useRef } from "react";
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
  const initialVimRef = useRef(vimMode);
  const onChangeRef = useLatestRef(onChange);
  const statusBarRef = useLatestRef(vimStatusBar);
  const viewRef = useRef<EditorView | null>(null);
  const vimCompartmentRef = useRef<Compartment | null>(null);

  // Toggling the setting reconfigures a live editor in place.
  useEffect(() => {
    if (!viewRef.current || !vimCompartmentRef.current) return;
    viewRef.current.dispatch({
      effects: vimCompartmentRef.current.reconfigure(
        vimMode ? vimExtensions : [],
      ),
    });
    if (vimMode) adoptStatusBar(viewRef.current, statusBarRef.current?.());
  }, [vimMode, statusBarRef]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    function reveal() {
      const view = viewRef.current;
      if (!view?.hasFocus) return;
      view.dispatch({
        effects: EditorView.scrollIntoView(view.state.selection.main.head, {
          y: "center",
        }),
      });
    }

    viewport.addEventListener("resize", reveal);
    return () => viewport.removeEventListener("resize", reveal);
  }, []);

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
  }, [onChangeRef, statusBarRef]);

  return <div ref={containerRef} className="min-h-[50dvh]" />;
}
