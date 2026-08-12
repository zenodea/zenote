import Link from "next/link";
import { getAllNotes } from "@/lib/notes";
import { Text } from "@/components/text";

export default async function Home() {
  const notes = await getAllNotes();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Notes</h1>

      <ul className="mt-8 divide-y divide-black/10 dark:divide-white/15">
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
  );
}
