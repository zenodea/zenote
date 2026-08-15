import { HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";

export const markdownHighlight = HighlightStyle.define([
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
  { tag: tags.processingInstruction, opacity: "0.45" },
  { tag: tags.meta, opacity: "0.45" },
]);
