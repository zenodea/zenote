import { notFound } from "next/navigation";
import { NoteView } from "@/components/note-view";
import { getNote } from "@/lib/notes";

export default async function Home() {
  const note = await getNote("postgres-indexes");
  if (!note) notFound();

  return <NoteView note={note} />;
}
