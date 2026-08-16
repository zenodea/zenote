import { createClient, getUser } from "@/lib/server/supabase";

type BodyRow = { slug: string; body: string; updated_at: string };

// Keeps each PostgREST in() filter comfortably inside URL limits.
const CHUNK = 100;

export async function POST(request: Request) {
  if (!(await getUser())) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const slugs: unknown = body?.slugs;
  if (
    !Array.isArray(slugs) ||
    slugs.length > 5000 ||
    !slugs.every((slug) => typeof slug === "string")
  ) {
    return new Response("Expected { slugs: string[] }.", { status: 400 });
  }

  const supabase = await createClient();
  const notes: { slug: string; body: string; updated: string }[] = [];

  for (let from = 0; from < slugs.length; from += CHUNK) {
    const { data, error } = await supabase
      .from("notes")
      .select("slug,body,updated_at")
      .in("slug", slugs.slice(from, from + CHUNK))
      .returns<BodyRow[]>();

    if (error) return new Response(error.message, { status: 500 });
    notes.push(
      ...data.map(({ slug, body: text, updated_at }) => ({
        slug,
        body: text,
        updated: updated_at,
      })),
    );
  }

  return Response.json({ notes });
}
