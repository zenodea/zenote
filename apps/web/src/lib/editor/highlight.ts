import { HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";

export const markdownHighlight = HighlightStyle.define([
  {
    tag: tags.heading1,
    fontSize: "2.25em",
    fontWeight: "800",
    lineHeight: "1.1111111",
  },
  {
    tag: tags.heading2,
    fontSize: "1.5em",
    fontWeight: "700",
    lineHeight: "1.3333333",
  },
  {
    tag: tags.heading3,
    fontSize: "1.25em",
    fontWeight: "600",
    lineHeight: "1.6",
  },
  { tag: tags.heading4, fontWeight: "600", lineHeight: "1.5" },
  { tag: tags.heading5, fontWeight: "600" },
  { tag: tags.heading6, fontWeight: "600", opacity: "0.8" },
  { tag: tags.strong, fontWeight: "600" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  {
    tag: tags.link,
    color: "var(--accent)",
    fontWeight: "500",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
  },
  { tag: tags.url, color: "var(--accent)", opacity: "0.7" },
  {
    tag: tags.monospace,
    fontFamily: "var(--font-geist-mono), monospace",
    fontSize: "0.875em",
    fontWeight: "600",
  },
  { tag: tags.quote, fontStyle: "italic", fontWeight: "500" },
  { tag: tags.processingInstruction, opacity: "0.45" },
  { tag: tags.meta, opacity: "0.45" },
]);
