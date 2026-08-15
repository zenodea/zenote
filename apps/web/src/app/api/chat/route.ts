import { getNote } from "@/lib/notes";
import type { Note } from "@/lib/notes";
import { getUser } from "@/lib/supabase/server";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`;

type ChatMessage = { role: "user" | "assistant"; content: string };

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Record<string, unknown>;
  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string"
  );
}

function systemPrompt(note: Note): string {
  return [
    "You are an assistant embedded in Z-Notes, a personal notes app.",
    "The user is currently reading the note below and wants to discuss it.",
    "Ground your answers in the note's content; if something is not covered by the note, say so before answering from general knowledge.",
    "Keep answers concise.",
    "",
    `Note title: ${note.title}`,
    "Note content:",
    "---",
    note.body,
    "---",
  ].join("\n");
}

// Re-emit only the text chunks from Gemini's SSE stream as plain text.
function extractText(
  upstream: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffered = "";

  return upstream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffered += decoder.decode(chunk, { stream: true });

        const lines = buffered.split("\n");
        buffered = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            const parts: { text?: string }[] =
              event.candidates?.[0]?.content?.parts ?? [];
            const text = parts.map((part) => part.text ?? "").join("");
            if (text) controller.enqueue(encoder.encode(text));
          } catch {
            // Ignore non-JSON keep-alive lines.
          }
        }
      },
    }),
  );
}

export async function POST(request: Request) {
  // Middleware already 401s this route; repeated here so the note contents
  // never depend on the matcher being right.
  if (!(await getUser())) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response("GEMINI_API_KEY is not configured on the server.", {
      status: 500,
    });
  }

  const body = await request.json().catch(() => null);
  const slug = body?.slug;
  const messages = body?.messages;

  if (
    typeof slug !== "string" ||
    !Array.isArray(messages) ||
    !messages.every(isChatMessage)
  ) {
    return new Response("Expected { slug, messages }.", { status: 400 });
  }

  const note = await getNote(slug);
  if (!note) return new Response("Note not found.", { status: 404 });

  const upstream = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt(note) }] },
      contents: messages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    console.error("Gemini request failed:", upstream.status, detail);
    return new Response("The AI provider returned an error.", { status: 502 });
  }

  return new Response(extractText(upstream.body), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
