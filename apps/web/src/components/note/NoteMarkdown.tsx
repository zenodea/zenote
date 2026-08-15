"use client";

import { isValidElement, type ComponentProps } from "react";
import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
import { remarkTag } from "@/lib/remark-tag";
import { remarkWikilink } from "@/lib/remark-wikilink";
import type { WikilinkResolver } from "@/lib/wikilinks";
import { CodeBlock } from "@/components/note/CodeBlock";
import { MermaidDiagram } from "@/components/note/MermaidDiagram";

const LANGUAGE_PREFIX = "language-";

function Pre({ children }: ComponentProps<"pre">) {
  if (!isValidElement(children)) return <pre>{children}</pre>;

  const code = children.props as { className?: string; children?: unknown };
  const text = String(code.children ?? "");
  const language = code.className
    ?.split(" ")
    .find((name) => name.startsWith(LANGUAGE_PREFIX))
    ?.slice(LANGUAGE_PREFIX.length);

  if (language === "mermaid") return <MermaidDiagram chart={text} />;

  return (
    <CodeBlock text={text} language={language}>
      {children}
    </CodeBlock>
  );
}

export function NoteMarkdown({
  source,
  resolver,
}: {
  source: string;
  resolver: WikilinkResolver;
}) {
  return (
    <Markdown
      remarkPlugins={[
        remarkGfm,
        remarkMath,
        [remarkWikilink, { resolver }],
        remarkTag,
      ]}
      rehypePlugins={[rehypeKatex]}
      components={{ pre: Pre }}
    >
      {source}
    </Markdown>
  );
}
