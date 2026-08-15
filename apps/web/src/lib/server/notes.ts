import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
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

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return entry.name.endsWith(".md") ? [full] : [];
    }),
  );

  return nested.flat();
}

function toSlug(absolute: string): string {
  return path
    .relative(CONTENT_DIR, absolute)
    .replace(/\.md$/, "")
    .split(path.sep)
    .join("/");
}

export const getNote = cache(async (slug: string): Promise<Note | null> => {
  const target = path.join(CONTENT_DIR, `${slug}.md`);

  if (!target.startsWith(CONTENT_DIR + path.sep)) return null;

  try {
    return toNote(slug, await fs.readFile(target, "utf8"));
  } catch {
    return null;
  }
});

export const getAllNotes = cache(async (): Promise<Note[]> => {
  const files = await walk(CONTENT_DIR);

  const notes = await Promise.all(
    files.map(async (file) =>
      toNote(toSlug(file), await fs.readFile(file, "utf8")),
    ),
  );

  return notes.sort((a, b) => a.slug.localeCompare(b.slug));
});
