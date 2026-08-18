import { EditorView } from "@codemirror/view";

export const editorTheme = EditorView.theme({
  "&": { backgroundColor: "transparent", fontSize: "1rem" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "inherit", lineHeight: "1.75" },
  ".cm-content": {
    padding: "0",
    caretColor: "var(--accent)",
  },
  ".cm-line": { padding: "0" },
  ".cm-line.cm-codeblock": {
    fontFamily: "var(--font-geist-mono), monospace",
    fontSize: "0.9em",
    backgroundColor:
      "color-mix(in srgb, var(--foreground) 6%, var(--background))",
  },
  ".cm-cursor": { borderLeftColor: "var(--accent)" },
  ".cm-panels": { border: "none", backgroundColor: "transparent" },
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
