import { PageHeader } from "@/components/frame/PageHeader";
import { NoteList } from "@/components/note/NoteList";
import { PageBody, noteCount } from "@/components/ui/PageBody";
import { getAllNotes } from "@/lib/server/notes";

export default async function Home() {
  const notes = await getAllNotes();

  return (
    <>
      <PageHeader title="Notes" meta={<span>{noteCount(notes.length)}</span>} />
      <PageBody>
        <NoteList
          notes={notes}
          subtitle={(note) =>
            note.tags.length > 0 ? note.tags.join(" · ") : null
          }
        />
      </PageBody>
    </>
  );
}
