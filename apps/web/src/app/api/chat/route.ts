import { createGoogle, type GoogleProvider } from "@ai-sdk/google";
import {
  convertToModelMessages,
  generateId,
  generateText,
  stepCountIs,
  streamText,
  validateUIMessages,
} from "ai";
import { isChatSubject, messageText, type VaultUIMessage } from "@/lib/chat";
import {
  gatherContext,
  type ContextNote,
  type NeighbourNote,
} from "@/lib/server/chat-context";
import { vaultTools } from "@/lib/server/chat-tools";
import {
  getChat,
  replayable,
  saveMessage,
  touchChat,
} from "@/lib/server/chats";
import { rateLimited } from "@/lib/server/rate-limit";
import { getUser } from "@/lib/server/supabase";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";

/** Model calls per user turn; each tool round trip is one more. */
const STEP_LIMIT = 6;

function systemPrompt(
  title: string | null,
  notes: ContextNote[],
  neighbours: NeighbourNote[],
  writes: boolean,
  notesOnly: boolean,
): string {
  return [
    "You are the assistant inside Zenote, a personal notes app.",
    "You answer from the user's own notes. What they are looking at is below in full; the rest of the vault is a tool call away — search_notes to find notes, read_note for a note's full text, neighbours to walk its links. Fetch what you need rather than guessing.",
    writes
      ? "You can also change the vault — create_note, append_to_note, move_note — and each such call is shown to the user to approve or refuse before it runs. Propose them when asked to capture or reorganise something, and never claim one happened until its result confirms it."
      : "You cannot change the vault; the user has switched writing off. If asked to, say so and offer the content in your reply instead.",
    "Name every note you draw on as a [[Wikilink]] with its exact title — the app turns those into links, so a claim the user cannot follow back to a note is worth less than one they can. After an answer drawn from the notes, call focus_graph with the titles you cited.",
    notesOnly
      ? "Answer only from the notes. If they do not cover something, say so plainly and leave it there — do not answer from general knowledge."
      : "If the notes do not cover something, say so plainly before answering from general knowledge.",
    "Keep answers concise.",
    ...(title === null
      ? [
          "",
          "The user is not looking at any note in particular; reach for the tools.",
        ]
      : [
          "",
          `# What the user is looking at: ${title}`,
          ...notes.flatMap((note) => [
            "",
            `## ${note.title} (${note.relation})`,
            note.body,
          ]),
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

/** A fresh thread earns its name from its first exchange. */
async function nameThread(
  google: GoogleProvider,
  chatId: string,
  question: string,
  answer: string,
) {
  const fallback = question.slice(0, 60);
  try {
    const { text } = await generateText({
      model: google(MODEL),
      prompt: [
        "Name this conversation the way a book names a chapter: at most five words, no punctuation, no quotes.",
        `Q: ${question.slice(0, 500)}`,
        `A: ${answer.slice(0, 500)}`,
        "Reply with the name only.",
      ].join("\n"),
      abortSignal: AbortSignal.timeout(10_000),
    });
    const title = text.trim().split("\n")[0].slice(0, 60);
    await touchChat(chatId, title || fallback);
  } catch {
    await touchChat(chatId, fallback);
  }
}

export async function POST(request: Request) {
  // Repeated after the middleware so note contents never depend on the matcher.
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (rateLimited(user.id)) {
    return new Response("Too many requests — give it a few minutes.", {
      status: 429,
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response("GEMINI_API_KEY is not configured on the server.", {
      status: 500,
    });
  }

  const body = await request.json().catch(() => null);
  const subject = body?.subject ?? null;

  let messages: VaultUIMessage[];
  try {
    messages = await validateUIMessages({ messages: body?.messages });
  } catch {
    return new Response("Expected { subject, messages }.", { status: 400 });
  }
  if (subject !== null && !isChatSubject(subject)) {
    return new Response("Expected { subject, messages }.", { status: 400 });
  }

  // No subject is a conversation about the vault at large, all through tools.
  const { title, notes, neighbours } = subject
    ? await gatherContext(subject)
    : { title: null, notes: [], neighbours: [] };
  if (subject && notes.length === 0) {
    return new Response("Nothing to talk about.", { status: 404 });
  }

  // Persistence follows the thread the client opened; selections stay ephemeral.
  const chat =
    typeof body?.chatId === "string" ? await getChat(body.chatId) : null;
  const chatId = chat?.id ?? null;

  const history = replayable(messages);
  const last = history[history.length - 1];
  if (chatId && last?.role === "user") {
    await saveMessage(chatId, last, "complete");
  }

  const allowWrites = body?.allowWrites !== false;
  const notesOnly = body?.notesOnly === true;

  const google = createGoogle({ apiKey });
  const tools = vaultTools();
  const result = streamText({
    model: google(MODEL),
    system: systemPrompt(title, notes, neighbours, allowWrites, notesOnly),
    messages: await convertToModelMessages(history, {
      tools,
      ignoreIncompleteToolCalls: true,
    }),
    tools,
    // The full set stays declared so stored turns still convert; only the
    // callable set narrows when the user switches writing off.
    activeTools: allowWrites
      ? undefined
      : ["search_notes", "read_note", "neighbours", "focus_graph"],
    stopWhen: stepCountIs(STEP_LIMIT),
    // A hung upstream should not hold the connection open forever.
    abortSignal: AbortSignal.any([request.signal, AbortSignal.timeout(90_000)]),
  });

  // Finish generating (and saving) even if the reader navigates away mid-answer.
  void result.consumeStream({ onError: () => {} });

  return result.toUIMessageStreamResponse({
    originalMessages: history,
    // Sent to the client, so both sides store the reply under one id — the
    // upsert on a tool-loop continuation depends on them agreeing.
    generateMessageId: generateId,
    onEnd: async ({ responseMessage, isAborted }) => {
      if (!chatId) return;
      await saveMessage(chatId, responseMessage, isAborted ? "aborted" : "complete");
      const question = history.findLast((message) => message.role === "user");
      if (chat?.title === "" && question) {
        await nameThread(
          google,
          chatId,
          messageText(question),
          messageText(responseMessage),
        );
      } else {
        await touchChat(chatId);
      }
    },
    onError: (error) => {
      console.error("Chat stream failed:", error);
      return "The AI provider returned an error.";
    },
  });
}
