import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Note } from "@/lib/notes";
import { remarkWikilink } from "@/lib/remark-wikilink";
import type { WikilinkResolver } from "@/lib/wikilinks";

export function NoteView({
  note,
  resolver,
}: {
  note: Note;
  resolver: WikilinkResolver;
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
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10"
            >
              {tag}
            </span>
          ))}
        </div>
      </header>

      <div className="prose prose-neutral max-w-none dark:prose-invert prose-pre:bg-black/80 prose-pre:text-neutral-100 dark:prose-pre:bg-black/50">
        <Markdown remarkPlugins={[remarkGfm, [remarkWikilink, { resolver }]]}>
          {note.body}
        </Markdown>
      </div>
    </article>
  );
}
