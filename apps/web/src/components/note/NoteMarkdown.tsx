"use client";

import { isValidElement, useMemo, type ComponentProps } from "react";
import Link from "next/link";
import Markdown, { defaultUrlTransform, type ExtraProps } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
import { remarkTag } from "@/lib/remark-tag";
import { remarkTodo } from "@/lib/remark-todo";
import { ATTACHMENT_PROTOCOL, remarkWikilink } from "@/lib/remark-wikilink";
import type { WikilinkResolver } from "@/lib/wikilinks";
import { AttachmentImage } from "@/components/note/AttachmentImage";
import { CodeBlock } from "@/components/note/CodeBlock";
import { ExcalidrawBlock } from "@/components/note/ExcalidrawBlock";
import { MermaidDiagram } from "@/components/note/MermaidDiagram";

const LANGUAGE_PREFIX = "language-";

function Pre({
  children,
  resolver,
}: ComponentProps<"pre"> & { resolver: WikilinkResolver }) {
  if (!isValidElement(children)) return <pre>{children}</pre>;

  const code = children.props as { className?: string; children?: unknown };
  const text = String(code.children ?? "");
  const language = code.className
    ?.split(" ")
    .find((name) => name.startsWith(LANGUAGE_PREFIX))
    ?.slice(LANGUAGE_PREFIX.length);

  if (language === "mermaid") return <MermaidDiagram chart={text} />;
  if (language === "excalidraw") {
    return <ExcalidrawBlock scene={text} resolver={resolver} />;
  }

  return (
    <CodeBlock text={text} language={language}>
      {children}
    </CodeBlock>
  );
}

function urlTransform(url: string): string {
  return url.startsWith(ATTACHMENT_PROTOCOL) ? url : defaultUrlTransform(url);
}

function Img(props: ComponentProps<"img"> & ExtraProps) {
  const { src, alt, ...rest } = props;
  delete rest.node;

  if (typeof src === "string" && src.startsWith(ATTACHMENT_PROTOCOL)) {
    let name = src.slice(ATTACHMENT_PROTOCOL.length);
    try {
      name = decodeURIComponent(name);
    } catch {}
    return <AttachmentImage name={name} alt={alt} />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt ?? ""} {...rest} />;
}

function Anchor(props: ComponentProps<"a"> & ExtraProps) {
  const { href, children, ...rest } = props;
  delete rest.node;

  if (href?.startsWith("/")) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}

export function NoteMarkdown({
  source,
  resolver,
}: {
  source: string;
  resolver: WikilinkResolver;
}) {
  const components = useMemo(
    () => ({
      pre: (props: ComponentProps<"pre">) => (
        <Pre {...props} resolver={resolver} />
      ),
      a: Anchor,
      img: Img,
    }),
    [resolver],
  );

  return (
    <Markdown
      remarkPlugins={[
        remarkGfm,
        remarkMath,
        remarkTodo,
        [remarkWikilink, { resolver }],
        remarkTag,
      ]}
      rehypePlugins={[rehypeKatex]}
      urlTransform={urlTransform}
      components={components}
    >
      {source}
    </Markdown>
  );
}
