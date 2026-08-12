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
import { CodeBlock } from "@/components/code-block";
import { MermaidDiagram } from "@/components/mermaid-diagram";

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
    <article className="mx-auto w-full max-w-3xl px-6 py-12">
      <header className="mb-10 border-b border-foreground/15 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">{note.title}</h1>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm opacity-60">
          {note.created && (
            <time dateTime={note.created}>
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
              className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs hover:opacity-70"
            >
              #{tag}
            </Link>
          ))}
        </div>
      </header>

      <div className="prose max-w-none prose-pre:bg-black/80 prose-pre:text-neutral-100 dark:prose-pre:bg-black/50">
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

      {backlinks.length > 0 && (
        <footer className="mt-16 border-t border-foreground/15 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
            Linked from
          </h2>
          <ul className="mt-3 space-y-1">
            {backlinks.map((backlink) => (
              <li key={backlink.slug}>
                <Link
                  href={`/notes/${backlink.slug}`}
                  className="text-sm hover:opacity-70"
                >
                  {backlink.title}
                </Link>
              </li>
            ))}
          </ul>
        </footer>
      )}
    </article>
  );
}
