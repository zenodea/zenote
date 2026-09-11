import { generateText } from "ai";
import { resolveModel } from "@/lib/server/ai-model";
import { getNoteTitles } from "@/lib/server/vault-data";
import { getUser } from "@/lib/server/supabase";

const SAMPLE = 14;

function prompt(groups: string[][]): string {
  return [
    "Below are groups of note titles from one person's notes app.",
    "Each group is a cluster of notes that link to each other.",
    "Name each group the way an atlas names a region: two or three words, no punctuation, no numbering.",
    "Reply with one name per line, in order, and nothing else.",
    "",
    ...groups.flatMap((titles, index) => [
      `Group ${index + 1}:`,
      ...titles.map((title) => `- ${title}`),
      "",
    ]),
  ].join("\n");
}

export async function POST(request: Request) {
  if (!(await getUser())) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const clusters: unknown = body?.clusters;
  const vaultId: unknown = body?.vaultId;
  if (typeof vaultId !== "string" || vaultId.length > 40) {
    return new Response("Expected { vaultId, clusters }.", { status: 400 });
  }

  if (
    !Array.isArray(clusters) ||
    !clusters.every(
      (slugs) =>
        Array.isArray(slugs) && slugs.every((s) => typeof s === "string"),
    )
  ) {
    return new Response("Expected { clusters: string[][] }.", { status: 400 });
  }

  const resolved = resolveModel(body);
  if ("error" in resolved) return Response.json({ names: [] });

  const titles = await getNoteTitles(vaultId);
  const groups = (clusters as string[][]).map((slugs) =>
    slugs.slice(0, SAMPLE).map((slug) => titles[slug] ?? slug),
  );
  if (groups.length === 0) return Response.json({ names: [] });

  let text: string;
  try {
    const result = await generateText({
      model: resolved.model,
      prompt: prompt(groups),
      abortSignal: AbortSignal.any([
        request.signal,
        AbortSignal.timeout(20_000),
      ]),
    });
    text = result.text;
  } catch (error) {
    console.error("Cluster naming failed:", error);
    return Response.json({ names: [] });
  }

  const names = text
    .split("\n")
    .map((line) => line.replace(/^[\s\-*\d.]+/, "").trim())
    .filter(Boolean)
    .slice(0, groups.length);

  return Response.json({ names });
}
