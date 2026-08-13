import { isValidElement, type ComponentProps } from "react";
import Link from "next/link";
import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
import type { Backlink } from "@/lib/backlinks";
import type { Note } from "@/lib/notes";
import { remarkTag } from "@/lib/remark-tag";
import { remarkWikilink } from "@/lib/remark-wikilink";
import { noteTags } from "@/lib/tags";
import type { WikilinkResolver } from "@/lib/wikilinks";
import { Backlinks } from "@/components/backlinks";
import { CodeBlock } from "@/components/code-block";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { PageHeader } from "@/components/page-header";

function Pre({ children }: ComponentProps<"pre">) {
  if (isValidElement(children)) {
    const code = children.props as { className?: string; children?: unknown };
    const text = String(code.children ?? "");
    if (code.className?.split(" ").includes("language-mermaid")) {
      return <MermaidDiagram chart={text} />;
    }
    return <CodeBlock text={text}>{children}</CodeBlock>;
  }
  return <pre>{children}</pre>;
}

export function NoteView({
  note,
  resolver,
  backlinks,
}: {
  note: Note;
  resolver: WikilinkResolver;
  backlinks: Backlink[];
}) {
  return (
    <>
      <PageHeader
        title={note.title}
        meta={
          <>
            {note.created && (
              <time dateTime={note.created} className="shrink-0">
                {new Date(note.created).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </time>
            )}
            {noteTags(note).map((tag) => (
              <Link
                key={tag}
                href={`/tags/${tag}`}
                className="shrink-0 rounded-full bg-foreground/10 px-2 py-0.5 text-xs hover:opacity-70"
              >
                #{tag}
              </Link>
            ))}
          </>
        }
      />

      <article className="mx-auto w-full max-w-3xl px-6 py-12">
        <div className="prose max-w-none">
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
            {note.body}
          </Markdown>
        </div>

        <Backlinks backlinks={backlinks} />
      </article>
    </>
  );
}
