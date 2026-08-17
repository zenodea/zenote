import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import matter from "gray-matter";
import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(path.join(process.cwd(), ".env.local"));
} catch {}

const CONTENT_DIR = path.join(process.cwd(), "content");
const BATCH = 200;

const DEV = { email: "dev@local.test", password: "devpassword" };
// Exists only to prove RLS isolation: dev@ must never see this note.
const CANARY = { email: "other@local.test", password: "otherpassword" };

type SeedNote = {
  slug: string;
  title: string;
  tags: string[];
  body: string;
  created_at: string;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing from apps/web/.env.local`);
  return value;
}

const supabase = createClient(
  required("NEXT_PUBLIC_SUPABASE_URL"),
  required("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function ensureUser(email: string, password: string): Promise<string> {
  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (!created.error) return created.data.user.id;

  const { data, error } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });
  if (error) throw error;

  const existing = data.users.find((user) => user.email === email);
  if (!existing) throw created.error;
  return existing.id;
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

async function readNote(file: string): Promise<SeedNote> {
  const [raw, stats] = await Promise.all([
    fs.readFile(file, "utf8"),
    fs.stat(file),
  ]);
  const { data, content } = matter(raw);

  const slug = path
    .relative(CONTENT_DIR, file)
    .replace(/\.md$/, "")
    .split(path.sep)
    .join("/");

  const declared = data.created ? new Date(data.created) : null;
  const created =
    declared && !Number.isNaN(declared.getTime()) ? declared : stats.birthtime;

  return {
    slug,
    title: typeof data.title === "string" ? data.title : slug,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    body: content.trim(),
    created_at: created.toISOString(),
  };
}

async function upsert(ownerId: string, notes: SeedNote[]) {
  for (let from = 0; from < notes.length; from += BATCH) {
    const chunk = notes
      .slice(from, from + BATCH)
      .map((note) => ({ ...note, owner_id: ownerId }));

    const { error } = await supabase
      .from("notes")
      .upsert(chunk, { onConflict: "owner_id,slug" });

    if (error) throw error;
  }
}

async function main() {
  const [devId, canaryId] = await Promise.all([
    ensureUser(DEV.email, DEV.password),
    ensureUser(CANARY.email, CANARY.password),
  ]);

  const files = await walk(CONTENT_DIR);
  const notes = await Promise.all(files.map(readNote));

  await upsert(devId, notes);
  await upsert(canaryId, [
    {
      slug: "canary",
      title: "canary",
      tags: ["canary"],
      body: "If this note is visible to dev@local.test, RLS is broken.",
      created_at: new Date().toISOString(),
    },
  ]);

  console.log(
    `Seeded ${notes.length} notes for ${DEV.email} / ${DEV.password}`,
  );
  console.log(`Seeded 1 canary note for ${CANARY.email} / ${CANARY.password}`);
}

main();
