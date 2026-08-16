import { isChatMessage, isChatSubject } from "@/lib/chat";
import { gatherContext, type ContextNote } from "@/lib/server/chat-context";
import { getUser } from "@/lib/server/supabase";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`;

function systemPrompt(title: string, notes: ContextNote[]): string {
  return [
    "You are the assistant inside Zenote, a personal notes app.",
    "Everything below is the user's own writing. Answer from it.",
    "Name every note you draw on as a [[Wikilink]] with its exact title — the app turns those into links and points the graph at them, so a claim the user cannot follow back to a note is worth less than one they can.",
    "If the notes do not cover something, say so plainly before answering from general knowledge.",
    "Keep answers concise.",
    "",
    `# What the user is looking at: ${title}`,
    ...notes.flatMap((note) => [
      "",
      `## ${note.title} (${note.relation})`,
      note.body,
    ]),
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
  // Repeated after the middleware so note contents never depend on the matcher.
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
  const subject = body?.subject;
  const messages = body?.messages;

  if (
    !isChatSubject(subject) ||
    !Array.isArray(messages) ||
    !messages.every(isChatMessage)
  ) {
    return new Response("Expected { subject, messages }.", { status: 400 });
  }

  const question = messages.findLast(
    (message: { role: string }) => message.role === "user",
  );
  const { title, notes } = await gatherContext(
    subject,
    question?.content ?? "",
  );
  if (notes.length === 0) {
    return new Response("Nothing to talk about.", { status: 404 });
  }

  const upstream = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt(title, notes) }],
      },
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
