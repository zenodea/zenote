import { createGoogle } from "@ai-sdk/google";
import { convertToModelMessages, streamText, validateUIMessages } from "ai";
import { isChatSubject, messageText, type VaultUIMessage } from "@/lib/chat";
import { gatherContext, type ContextNote } from "@/lib/server/chat-context";
import { getUser } from "@/lib/server/supabase";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";

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

  let messages: VaultUIMessage[];
  try {
    messages = await validateUIMessages({ messages: body?.messages });
  } catch {
    return new Response("Expected { subject, messages }.", { status: 400 });
  }
  if (!isChatSubject(subject)) {
    return new Response("Expected { subject, messages }.", { status: 400 });
  }

  const question = messages.findLast((message) => message.role === "user");
  const { title, notes } = await gatherContext(
    subject,
    question ? messageText(question) : "",
  );
  if (notes.length === 0) {
    return new Response("Nothing to talk about.", { status: 404 });
  }

  const google = createGoogle({ apiKey });
  const result = streamText({
    model: google(MODEL),
    system: systemPrompt(title, notes),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onError: (error) => {
      console.error("Chat stream failed:", error);
      return "The AI provider returned an error.";
    },
  });
}
