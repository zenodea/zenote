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
    padding: "0 1.1428571em",
    fontFamily: "var(--font-geist-mono), monospace",
    fontSize: "0.875em",
    lineHeight: "1.7142857",
    backgroundColor:
      "color-mix(in srgb, var(--foreground) 6%, var(--background))",
  },
  ".cm-line.cm-codeblock-open": {
    paddingTop: "0.8571429em",
    borderTopLeftRadius: "0.375rem",
    borderTopRightRadius: "0.375rem",
  },
  ".cm-line.cm-codeblock-close": {
    paddingBottom: "0.8571429em",
    borderBottomLeftRadius: "0.375rem",
    borderBottomRightRadius: "0.375rem",
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
