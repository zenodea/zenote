import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllNotes } from "@/lib/notes";
import { buildTagIndex, noteTags } from "@/lib/tags";
import { Text } from "@/components/text";

export async function generateStaticParams() {
  const index = buildTagIndex(await getAllNotes());
  return [...index.keys()].map((tag) => ({ tag }));
}

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
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">#{name}</h1>
      <p className="mt-2 text-sm opacity-60">
        {notes.length} {notes.length === 1 ? "note" : "notes"}
      </p>

      <ul className="mt-8 divide-y divide-foreground/15">
        {notes.map((note) => (
          <li key={note.slug}>
            <Link
              href={`/notes/${note.slug}`}
              className="block py-4 hover:opacity-70"
            >
              <Text variant="strong">{note.title}</Text>
              <Text variant="muted" className="ml-3">
                {noteTags(note)
                  .filter((other) => other !== name)
                  .map((other) => `#${other}`)
                  .join(" ")}
              </Text>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
