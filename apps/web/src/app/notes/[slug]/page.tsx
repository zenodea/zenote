import { notFound } from "next/navigation";
import { NoteView } from "@/components/note-view";
import { getAllNotes, getNote } from "@/lib/notes";

export async function generateStaticParams() {
  const notes = await getAllNotes();
  return notes.map((note) => ({ slug: note.slug }));
}

export async function generateMetadata({ params }: PageProps<"/notes/[slug]">) {
  const { slug } = await params;
  const note = await getNote(slug);
  return { title: note ? note.title : "Not found" };
}

export default async function NotePage({ params }: PageProps<"/notes/[slug]">) {
  const { slug } = await params;
  const note = await getNote(slug);
  if (!note) notFound();

  return <NoteView note={note} />;
}
