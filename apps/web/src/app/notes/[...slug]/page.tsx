import { NoteView } from "@/components/note-view";
import { buildBacklinks } from "@/lib/backlinks";
import { getAllNotes, getNote } from "@/lib/notes";
import { buildResolver } from "@/lib/wikilinks";

export async function generateStaticParams() {
  const notes = await getAllNotes();
  return notes.map((note) => ({ slug: note.slug.split("/") }));
}

export async function generateMetadata({
  params,
}: PageProps<"/notes/[...slug]">) {
  const { slug } = await params;
  const note = await getNote(slug.map(decodeURIComponent).join("/"));

  return {
    title: note ? note.title : decodeURIComponent(slug[slug.length - 1]),
  };
}

export default async function NotePage({
  params,
}: PageProps<"/notes/[...slug]">) {
  const { slug } = await params;
  const joined = slug.map(decodeURIComponent).join("/");
  const note = await getNote(joined);

  const notes = await getAllNotes();
  const resolver = buildResolver(notes);
  const backlinks = note
    ? (buildBacklinks(notes, resolver).get(note.slug) ?? [])
    : [];

  return (
    <NoteView
      key={joined}
      note={note}
      slug={joined}
      resolver={Object.fromEntries(resolver)}
      linkTitles={notes.map((entry) => entry.title)}
      backlinks={backlinks}
    />
  );
}
