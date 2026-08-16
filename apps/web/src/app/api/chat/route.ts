import { createGoogle } from "@ai-sdk/google";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  validateUIMessages,
} from "ai";
import { isChatSubject, type VaultUIMessage } from "@/lib/chat";
import {
  gatherContext,
  type ContextNote,
  type NeighbourNote,
} from "@/lib/server/chat-context";
import { vaultTools } from "@/lib/server/chat-tools";
import {
  getNoteId,
  getOrCreateChat,
  replayable,
  saveMessage,
} from "@/lib/server/chats";
import { getUser } from "@/lib/server/supabase";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";

/** Model calls per user turn; each tool round trip is one more. */
const STEP_LIMIT = 6;

function systemPrompt(
  title: string,
  notes: ContextNote[],
  neighbours: NeighbourNote[],
): string {
  return [
    "You are the assistant inside Zenote, a personal notes app.",
    "You answer from the user's own notes. What they are looking at is below in full; the rest of the vault is a tool call away — search_notes to find notes, read_note for a note's full text, neighbours to walk its links. Fetch what you need rather than guessing.",
    "Name every note you draw on as a [[Wikilink]] with its exact title — the app turns those into links, so a claim the user cannot follow back to a note is worth less than one they can. After an answer drawn from the notes, call focus_graph with the titles you cited.",
    "If the notes do not cover something, say so plainly before answering from general knowledge.",
    "Keep answers concise.",
    "",
    `# What the user is looking at: ${title}`,
    ...notes.flatMap((note) => [
      "",
      `## ${note.title} (${note.relation})`,
      note.body,
    ]),
    ...(neighbours.length > 0
      ? [
          "",
          "# One link away",
          ...neighbours.map(
            (neighbour) => `- [[${neighbour.title}]] (${neighbour.relation})`,
          ),
        ]
      : []),
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

  const { title, notes, neighbours } = await gatherContext(subject);
  if (notes.length === 0) {
    return new Response("Nothing to talk about.", { status: 404 });
  }

  // Note threads persist; a graph selection is an ephemeral conversation.
  let chatId: string | null = null;
  if (subject.kind === "note") {
    const noteId = await getNoteId(subject.slug);
    chatId = noteId ? await getOrCreateChat(noteId) : null;
  }

  const history = replayable(messages);
  const last = history[history.length - 1];
  if (chatId && last?.role === "user") {
    await saveMessage(chatId, last, "complete");
  }

  const google = createGoogle({ apiKey });
  const tools = vaultTools();
  const result = streamText({
    model: google(MODEL),
    system: systemPrompt(title, notes, neighbours),
    messages: await convertToModelMessages(history, {
      tools,
      ignoreIncompleteToolCalls: true,
    }),
    tools,
    stopWhen: stepCountIs(STEP_LIMIT),
  });

  // Finish generating (and saving) even if the reader navigates away mid-answer.
  void result.consumeStream({ onError: () => {} });

  return result.toUIMessageStreamResponse({
    originalMessages: history,
    onEnd: async ({ responseMessage, isAborted }) => {
      if (!chatId) return;
      await saveMessage(chatId, responseMessage, isAborted ? "aborted" : "complete");
    },
    onError: (error) => {
      console.error("Chat stream failed:", error);
      return "The AI provider returned an error.";
    },
  });
}
