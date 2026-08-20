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

const STEP_LIMIT = 6;

function wikilink(slug: string, title: string): string {
  return title === slug ? `[[${slug}]]` : `[[${slug}|${title}]]`;
}

function systemPrompt(
  title: string | null,
  notes: ContextNote[],
  neighbours: NeighbourNote[],
  writes: boolean,
  notesOnly: boolean,
): string {
  return [
    "You are the assistant inside Zenote, a personal notes app.",
    "You answer from the user's own notes. What they are looking at is below in full; the rest of the vault is a tool call away — search_notes to find notes, read_note for a note's full text, neighbours to walk its links, list_notes and list_tags for the vault's shape, recent_changes for what was touched lately, vault_health for broken links and orphans. Fetch what you need rather than guessing.",
    "draw_graph sketches a small concept map inside the conversation — reach for it when the user asks how ideas relate, or when a picture would say it better than a paragraph. It may connect concepts the vault never wikilinked.",
    'For richer diagrams — boxes, arrows, flows, layouts — write a fenced ```excalidraw code block; the app renders it as a drawing, both in the conversation and inside notes. Its body is JSON: {"elements": [...]} where each element is a skeleton like {"type": "rectangle"|"ellipse"|"diamond", "id": "a", "x": 0, "y": 0, "width": 160, "height": 60, "label": {"text": "Box"}} or a connector {"type": "arrow", "x": 0, "y": 0, "start": {"id": "a"}, "end": {"id": "b"}, "label": {"text": "flows to"}} or free text {"type": "text", "x": 0, "y": 0, "text": "note"}. Give shapes generous spacing (100+ px gaps) so labels never overlap.',
    writes
      ? "You can also change the vault — create_note, append_to_note, replace_in_note, move_note — and each such call is shown to the user to approve or refuse before it runs. Propose them when asked to capture, correct or reorganise something, and never claim one happened until its result confirms it."
      : "You cannot change the vault; the user has switched writing off. If asked to, say so and offer the content in your reply instead.",
    "Name every note you draw on as a wikilink in the form [[slug|Title]]: its exact slug, then its title as the display text, as in [[security-concepts|Security Concepts]]. The slug is the half the app resolves and the half that survives a rename; the title is only what the reader sees. A bare [[Security Concepts]] is a link waiting to break, and a slug you invented from a title is one that never worked. Every note in this prompt is given with its slug, and search_notes, read_note, neighbours, list_notes, recent_changes and vault_health all return one — take the slug from there.",
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
            `## ${note.title} — slug: ${note.slug} (${note.relation})`,
            note.body,
          ]),
        ]),
    ...(neighbours.length > 0
      ? [
          "",
          "# One link away",
          ...neighbours.map(
            (neighbour) =>
              `- ${wikilink(neighbour.slug, neighbour.title)} (${neighbour.relation})`,
          ),
        ]
      : []),
  ].join("\n");
}

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
  const vaultId: unknown = body?.vaultId;
  if (typeof vaultId !== "string" || vaultId.length > 40) {
    return new Response("Expected { vaultId, subject, messages }.", {
      status: 400,
    });
  }

  let messages: VaultUIMessage[];
  try {
    messages = await validateUIMessages({ messages: body?.messages });
  } catch {
    return new Response("Expected { subject, messages }.", { status: 400 });
  }
  if (subject !== null && !isChatSubject(subject)) {
    return new Response("Expected { subject, messages }.", { status: 400 });
  }

  const { title, notes, neighbours } = subject
    ? await gatherContext(vaultId, subject)
    : { title: null, notes: [], neighbours: [] };
  if (subject && notes.length === 0) {
    return new Response("Nothing to talk about.", { status: 404 });
  }

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
  const tools = vaultTools(vaultId);
  const result = streamText({
    model: google(MODEL),
    system: systemPrompt(title, notes, neighbours, allowWrites, notesOnly),
    messages: await convertToModelMessages(history, {
      tools,
      ignoreIncompleteToolCalls: true,
    }),
    tools,
    activeTools: allowWrites
      ? undefined
      : [
          "search_notes",
          "read_note",
          "neighbours",
          "recent_changes",
          "list_notes",
          "list_tags",
          "vault_health",
          "draw_graph",
        ],
    stopWhen: stepCountIs(STEP_LIMIT),
    abortSignal: AbortSignal.any([request.signal, AbortSignal.timeout(90_000)]),
  });

  void result.consumeStream({ onError: () => {} });

  return result.toUIMessageStreamResponse({
    originalMessages: history,
    generateMessageId: generateId,
    onEnd: async ({ responseMessage, isAborted }) => {
      if (!chatId) return;
      await saveMessage(
        chatId,
        responseMessage,
        isAborted ? "aborted" : "complete",
      );
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
