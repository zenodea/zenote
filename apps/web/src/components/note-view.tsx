"use client";

import {
  isValidElement,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
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
import { useSettings } from "@/lib/settings";
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
    const language = code.className
      ?.split(" ")
      .find((name) => name.startsWith("language-"))
      ?.slice("language-".length);
    if (language === "mermaid") {
      return <MermaidDiagram chart={text} />;
    }
    return (
      <CodeBlock text={text} language={language}>
        {children}
      </CodeBlock>
    );
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
  linkTitles,
  backlinks,
}: {
  note: Note | null;
  slug: string;
  resolver: Record<string, string>;
  /** Titles of all vault notes, for the editor's `[[` autocomplete. */
  linkTitles: string[];
  backlinks: Backlink[];
}) {
  const overlay = useOverlay();
  const settings = useSettings();
  const local = overlay.notes[slug];
  const body = local?.hidden ? undefined : (local?.body ?? note?.body);

  // Empty notes open in the editor; else the setting decides, pencil overrides.
  const [startedEmpty] = useState(body === "");
  const [readingOverride, setReadingOverride] = useState<boolean | null>(null);
  const vimBarRef = useRef<HTMLDivElement>(null);
  const reading =
    readingOverride ?? (startedEmpty ? false : !settings.openInEditMode);
  const resolverMap = useMemo(
    () => new Map(Object.entries(resolver)),
    [resolver],
  );
  const linkTargets = useMemo(() => {
    const titles = new Set(linkTitles);
    for (const [other, entry] of Object.entries(overlay.notes)) {
      if (!entry.hidden && entry.body !== undefined) {
        titles.add(other.split("/").pop()!);
      }
    }
    return [...titles].sort((a, b) => a.localeCompare(b));
  }, [linkTitles, overlay]);

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
          </>
        }
        actions={
          <Button
            onClick={() => setReadingOverride(!reading)}
            active={!reading}
            aria-pressed={!reading}
            aria-label={reading ? "Edit note" : "Reading view"}
            title={reading ? "Edit note" : "Reading view"}
          >
            <PencilIcon />
          </Button>
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
              linkTargets={linkTargets}
              vimMode={settings.vimMode}
              vimStatusBar={() => vimBarRef.current}
            />
          )}

          {reading && <Backlinks backlinks={backlinks} />}
        </article>
      </div>

      {/* Vim's : and / prompts, in the same footer plane the find bar uses. */}
      {!reading && settings.vimMode && (
        <div
          data-seam="top"
          className="vim-bar absolute inset-x-0 bottom-0 border-t border-foreground/15 bg-background"
        >
          <div
            ref={vimBarRef}
            className="vim-statusbar flex h-11 items-center gap-2 px-4 font-mono text-xs"
          />
        </div>
      )}
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

