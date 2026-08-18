import Link from "next/link";
import type { ReactNode } from "react";
import { Text } from "@/components/ui/Text";
import type { Note } from "@/lib/server/notes";

export function NoteList({
  notes,
  subtitle,
}: {
  notes: Note[];
  subtitle?: (note: Note) => ReactNode;
}) {
  return (
    <ul className="divide-y divide-foreground/15">
      {notes.map((note) => {
        const meta = subtitle?.(note);
        return (
          <li key={note.slug}>
            <Link
              href={`/notes/${note.slug}`}
              prefetch={false}
              className="block py-4 hover:opacity-70"
            >
              <Text variant="strong">{note.title}</Text>
              {meta ? (
                <Text variant="muted" className="ml-3">
                  {meta}
                </Text>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
