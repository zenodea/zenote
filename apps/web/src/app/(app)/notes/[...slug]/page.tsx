import { NoteView } from "@/components/note/NoteView";
import { localGraph } from "@/lib/graph/model";
import { getAllNotes, getNote } from "@/lib/server/notes";
import { getBacklinks, getGraph, getResolver } from "@/lib/server/vault-data";

export async function generateMetadata({
  params,
}: PageProps<"/notes/[...slug]">) {
  const { slug } = await params;
  const joined = slug.map(decodeURIComponent).join("/");
  const note = await getNote(joined);

  return {
    title: note ? note.title : decodeURIComponent(slug[slug.length - 1]),
  };
}

export default async function NotePage({
  params,
}: PageProps<"/notes/[...slug]">) {
  const { slug } = await params;
  const joined = slug.map(decodeURIComponent).join("/");

  const [note, notes, resolver, backlinks, graph] = await Promise.all([
    getNote(joined),
    getAllNotes(),
    getResolver(),
    getBacklinks(),
    getGraph(),
  ]);

  return (
    <NoteView
      key={joined}
      note={note}
      slug={joined}
      resolver={Object.fromEntries(resolver)}
      linkTitles={notes.map((entry) => entry.title)}
      backlinks={note ? (backlinks.get(note.slug) ?? []) : []}
      neighbourhood={localGraph(graph, joined)}
    />
  );
}
