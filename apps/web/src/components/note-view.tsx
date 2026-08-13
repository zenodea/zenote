"use client";

import { isValidElement, useMemo, useState, type ComponentProps } from "react";
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
import { revertNote, updateNote, useOverlay } from "@/lib/vault";
import { Backlinks } from "@/components/backlinks";
import { Button } from "@/components/button";
import { CodeBlock } from "@/components/code-block";
import { MarkdownEditor } from "@/components/markdown-editor";
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

function stripTitleHeading(note: Note): string {
  const match = note.body.match(/^#\s+(.+?)\s*(?:\r?\n+|$)/);
  if (match && match[1].toLowerCase() === note.title.trim().toLowerCase()) {
    return note.body.slice(match[0].length);
  }
  return note.body;
}

export function NoteView({
  note,
  slug,
  resolver,
  backlinks,
}: {
  note: Note | null;
  slug: string;
  resolver: Record<string, string>;
  backlinks: Backlink[];
}) {
  const overlay = useOverlay();
  const local = overlay.notes[slug];
  const body = local?.hidden ? undefined : (local?.body ?? note?.body);

  // Brand-new notes open straight into live editing.
  const [reading, setReading] = useState(body !== "");
  const resolverMap = useMemo(
    () => new Map(Object.entries(resolver)),
    [resolver],
  );

  if (body === undefined) {
    return (
      <>
        <PageHeader title="Not found" />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <p className="mx-auto w-full max-w-3xl px-6 py-12 opacity-60">
            There is no note at “{slug}”.
          </p>
        </div>
      </>
    );
  }

  const effective: Note = note
    ? { ...note, body }
    : { slug, title: slug.split("/").pop()!, tags: [], created: null, body };
  const isLocal = local?.body !== undefined;

  const markdown = (source: string) => (
    <Markdown
      remarkPlugins={[
        remarkGfm,
        remarkMath,
        [remarkWikilink, { resolver: resolverMap }],
        remarkTag,
      ]}
      rehypePlugins={[rehypeKatex]}
      components={{ pre: Pre }}
    >
      {source}
    </Markdown>
  );

  return (
    <>
      <PageHeader
        title={effective.title}
        meta={
          <>
            {effective.created && (
              <time dateTime={effective.created} className="shrink-0">
                {new Date(effective.created).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </time>
            )}
            {noteTags(effective).map((tag) => (
              <Link
                key={tag}
                href={`/tags/${tag}`}
                className="shrink-0 rounded-full bg-foreground/10 px-2 py-0.5 text-xs hover:opacity-70"
              >
                #{tag}
              </Link>
            ))}
            {isLocal && (
              <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                {note ? "edited locally" : "local note"}
              </span>
            )}
            {isLocal && note && reading && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Revert this note to the vault version?")) {
                    revertNote(slug);
                  }
                }}
                className="shrink-0 text-xs opacity-60 hover:opacity-100"
              >
                Revert
              </button>
            )}
            <Button
              onClick={() => setReading(!reading)}
              active={!reading}
              aria-pressed={!reading}
              aria-label={reading ? "Edit note" : "Reading view"}
              title={reading ? "Edit note" : "Reading view"}
              className="shrink-0"
            >
              <PencilIcon />
            </Button>
          </>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <article className="mx-auto w-full max-w-3xl px-6 py-12">
          {reading ? (
            <div className="prose max-w-none">
              {markdown(stripTitleHeading(effective))}
            </div>
          ) : (
            // Keyed so toggling back in re-reads the current overlay body.
            <MarkdownEditor
              key={slug}
              initialBody={body}
              onChange={(next) => updateNote(slug, next)}
            />
          )}

          {reading && <Backlinks backlinks={backlinks} />}
        </article>
      </div>
    </>
  );
}

function PencilIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="block"
    >
      <path d="M11.5 2 14 4.5 5.5 13 2 14l1-3.5L11.5 2Z" />
    </svg>
  );
}

