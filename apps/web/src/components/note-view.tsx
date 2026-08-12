import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Backlink } from "@/lib/backlinks";
import type { Note } from "@/lib/notes";
import { remarkTag } from "@/lib/remark-tag";
import { remarkWikilink } from "@/lib/remark-wikilink";
import { noteTags } from "@/lib/tags";
import type { WikilinkResolver } from "@/lib/wikilinks";

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
      <header className="mb-10 border-b border-black/10 pb-6 dark:border-white/15">
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
              className="rounded-full bg-black/5 px-2 py-0.5 text-xs hover:opacity-70 dark:bg-white/10"
            >
              #{tag}
            </Link>
          ))}
        </div>
      </header>

      <div className="prose prose-neutral max-w-none dark:prose-invert prose-pre:bg-black/80 prose-pre:text-neutral-100 dark:prose-pre:bg-black/50">
        <Markdown
          remarkPlugins={[remarkGfm, [remarkWikilink, { resolver }], remarkTag]}
        >
          {note.body}
        </Markdown>
      </div>

      {backlinks.length > 0 && (
        <footer className="mt-16 border-t border-black/10 pt-6 dark:border-white/15">
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
