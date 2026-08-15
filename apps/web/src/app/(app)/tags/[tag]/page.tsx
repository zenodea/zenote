import { notFound } from "next/navigation";
import { PageHeader } from "@/components/frame/PageHeader";
import { NoteList } from "@/components/note/NoteList";
import { PageBody, noteCount } from "@/components/ui/PageBody";
import { getAllNotes } from "@/lib/server/notes";
import { buildTagIndex, noteTags } from "@/lib/tags";

export async function generateMetadata({ params }: PageProps<"/tags/[tag]">) {
  const { tag } = await params;
  return { title: `#${decodeURIComponent(tag)}` };
}

export default async function TagPage({ params }: PageProps<"/tags/[tag]">) {
  const { tag } = await params;
  const name = decodeURIComponent(tag).toLowerCase();

  const notes = buildTagIndex(await getAllNotes()).get(name);
  if (!notes) notFound();

  return (
    <>
      <PageHeader
        title={`#${name}`}
        meta={<span>{noteCount(notes.length)}</span>}
      />
      <PageBody>
        <NoteList
          notes={notes}
          subtitle={(note) =>
            noteTags(note)
              .filter((other) => other !== name)
              .map((other) => `#${other}`)
              .join(" ")
          }
        />
      </PageBody>
    </>
  );
}
