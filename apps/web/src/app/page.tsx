import Link from "next/link";
import { getAllNotes } from "@/lib/notes";
import { PageHeader } from "@/components/page-header";
import { Text } from "@/components/text";

export default async function Home() {
  const notes = await getAllNotes();

  return (
    <>
      <PageHeader
        title="Notes"
        meta={<span>{notes.length === 1 ? "1 note" : `${notes.length} notes`}</span>}
      />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-3xl px-6 py-6">
          <ul className="divide-y divide-foreground/15">
            {notes.map((note) => (
              <li key={note.slug}>
                <Link
                  href={`/notes/${note.slug}`}
                  className="block py-4 hover:opacity-70"
                >
                  <Text variant="strong">{note.title}</Text>
                  {note.tags.length > 0 && (
                    <Text variant="muted" className="ml-3">
                      {note.tags.join(" · ")}
                    </Text>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
