"use client";

import {
  isValidElement,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
import type { Backlink } from "@/lib/backlinks";
import type { Graph } from "@/lib/graph/model";
import type { Note } from "@/lib/notes";
import { remarkTag } from "@/lib/remark-tag";
import { remarkWikilink } from "@/lib/remark-wikilink";
import { useSettings } from "@/lib/settings";
import { noteTags } from "@/lib/tags";
import {
  deleteNote,
  renameNote,
  revertNote,
  sanitizeName,
  updateNote,
  useOverlay,
} from "@/lib/vault";
import { Backlinks } from "@/components/note/Backlinks";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { Modal } from "@/components/ui/Modal";
import { Scroller } from "@/components/ui/Scroller";
import { EllipsisIcon, PencilIcon } from "@/components/ui/Icons";
import { CodeBlock } from "@/components/note/CodeBlock";
import { MarkdownEditor } from "@/components/note/MarkdownEditor";
import { MermaidDiagram } from "@/components/note/MermaidDiagram";
import { NoteGraph } from "@/components/note/NoteGraph";
import { PageHeader } from "@/components/frame/PageHeader";

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
  neighbourhood,
}: {
  note: Note | null;
  slug: string;
  resolver: Record<string, string>;
  /** Titles of all vault notes, for the editor's `[[` autocomplete. */
  linkTitles: string[];
  backlinks: Backlink[];
  neighbourhood: Graph;
}) {
  const router = useRouter();
  const overlay = useOverlay();
  const settings = useSettings();
  const local = overlay.notes[slug];
  const body = local?.hidden ? undefined : (local?.body ?? note?.body);

  // Empty notes open in the editor; else the setting decides, pencil overrides.
  const [startedEmpty] = useState(body === "");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
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
    const deletedLocally = Boolean(local?.hidden && !local.movedTo && note);
    return (
      <>
        <PageHeader title="Not found" />
        <Scroller className="min-h-0 flex-1">
          <div className="mx-auto w-full max-w-3xl px-6 py-12">
            <p className="opacity-60">
              {deletedLocally
                ? `“${slug}” was deleted locally.`
                : `There is no note at “${slug}”.`}
            </p>
            {deletedLocally && (
              <button
                type="button"
                onClick={() => revertNote(slug)}
                className="mt-3 rounded border border-foreground/15 px-2 py-1 text-sm hover:bg-foreground/10"
              >
                Restore note
              </button>
            )}
          </div>
        </Scroller>
      </>
    );
  }

  const effective: Note = note
    ? { ...note, body }
    : { slug, title: slug.split("/").pop()!, tags: [], created: null, body };
  const isLocal = local?.body !== undefined;

  function submitRename() {
    const next = renaming === null ? null : sanitizeName(renaming);
    setRenaming(null);
    if (!next || next === slug) return;
    renameNote(slug, next, { body: effective.body, isBaseNote: note !== null });
    router.push(`/notes/${next}`);
  }

  function submitDelete() {
    setDeleting(false);
    deleteNote(slug, note !== null);
    router.push("/");
  }

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
          <>
            <Button
              onClick={() => setReadingOverride(!reading)}
              active={!reading}
              aria-pressed={!reading}
              aria-label={reading ? "Edit note" : "Reading view"}
              title={reading ? "Edit note" : "Reading view"}
            >
              <PencilIcon />
            </Button>
            <Dropdown
              label={<EllipsisIcon />}
              ariaLabel="Note actions"
              triggerClassName="rounded p-1.5 opacity-60 hover:bg-foreground/10 hover:opacity-100"
            >
              <button
                type="button"
                onClick={() => setRenaming(slug)}
                className="block w-full rounded px-2 py-1 text-left hover:bg-foreground/10"
              >
                Rename…
              </button>
              <button
                type="button"
                onClick={() => setDeleting(true)}
                className="block w-full rounded px-2 py-1 text-left text-[#ef4444] hover:bg-foreground/10"
              >
                Delete
              </button>
            </Dropdown>
          </>
        }
      />

      <Scroller className="min-h-0 flex-1">
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

          {reading && <NoteGraph graph={neighbourhood} focusId={slug} />}

          {reading && <Backlinks backlinks={backlinks} />}
        </article>
      </Scroller>

      {renaming !== null && (
        <Modal title="Rename note" onClose={() => setRenaming(null)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitRename();
            }}
            className="mt-3 flex flex-col gap-3"
          >
            <input
              autoFocus
              value={renaming}
              onChange={(event) => setRenaming(event.target.value)}
              aria-label="New note name"
              className="w-full rounded border border-foreground/15 bg-background px-2 py-1 placeholder:opacity-50 focus:border-foreground/40 focus:outline-none"
            />
            <p className="text-xs opacity-60">
              Include a path to move it, e.g. ideas/spark.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenaming(null)}
                className="rounded px-2 py-1 opacity-60 hover:bg-foreground/10 hover:opacity-100"
              >
                Cancel
              </button>
              <Button variant="solid" type="submit">
                Rename
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete note" onClose={() => setDeleting(false)}>
          <p className="mt-3 opacity-70">
            Delete “{effective.title}”?
            {note ? " You can restore it from this page until you sync." : ""}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleting(false)}
              className="rounded px-2 py-1 opacity-60 hover:bg-foreground/10 hover:opacity-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitDelete}
              className="rounded border border-[#ef4444]/40 px-3 py-1.5 font-medium text-[#ef4444] hover:bg-[#ef4444]/10"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}

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


