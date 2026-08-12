import { notFound } from "next/navigation";
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
  const note = await getNote(slug.join("/"));
  return { title: note ? note.title : "Not found" };
}

export default async function NotePage({
  params,
}: PageProps<"/notes/[...slug]">) {
  const { slug } = await params;
  const note = await getNote(slug.join("/"));
  if (!note) notFound();

  const notes = await getAllNotes();
  const resolver = buildResolver(notes);
  const backlinks = buildBacklinks(notes, resolver).get(note.slug) ?? [];

  return <NoteView note={note} resolver={resolver} backlinks={backlinks} />;
}
