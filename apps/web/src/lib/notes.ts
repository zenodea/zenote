import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content");

export type Note = {
  slug: string;
  title: string;
  tags: string[];
  created: string | null;
  body: string;
};

function toNote(slug: string, raw: string): Note {
  const { data, content } = matter(raw);

  return {
    slug,
    title: typeof data.title === "string" ? data.title : slug,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    created: data.created ? new Date(data.created).toISOString() : null,
    body: content.trim(),
  };
}

export async function getNote(slug: string): Promise<Note | null> {
  try {
    const raw = await fs.readFile(path.join(CONTENT_DIR, `${slug}.md`), "utf8");
    return toNote(slug, raw);
  } catch {
    return null;
  }
}

export async function getAllNotes(): Promise<Note[]> {
  const entries = await fs.readdir(CONTENT_DIR);
  const slugs = entries
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.replace(/\.md$/, ""));

  const notes = await Promise.all(slugs.map((slug) => getNote(slug)));
  return notes.filter((note): note is Note => note !== null);
}
