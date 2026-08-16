import "server-only";
import type { ChatMessageMeta, VaultUIMessage } from "../chat";
import { createClient } from "./supabase";

type MessageRow = {
  status: NonNullable<ChatMessageMeta["status"]>;
  message: VaultUIMessage;
};

/** Turns kept when replaying a thread to the model — a cost ceiling, not a UI limit. */
const REPLAY_LIMIT = 30;

export type ChatRow = {
  id: string;
  title: string;
  note_id: string | null;
};

export async function getNoteId(slug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notes")
    .select("id")
    .eq("slug", slug)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

export async function getChat(chatId: string): Promise<ChatRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chats")
    .select("id,title,note_id")
    .eq("id", chatId)
    .maybeSingle<ChatRow>();
  return data;
}

/** The newest thread wins: it is the one the panel resumes for a note. */
export async function latestChatId(noteId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chats")
    .select("id")
    .eq("note_id", noteId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

export async function insertChat(noteId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chats")
    .insert({ note_id: noteId })
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error) console.error("Could not open chat:", error.message);
  return data?.id ?? null;
}

/** Stamps recency; with a title, names the thread too. */
export async function touchChat(chatId: string, title?: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("chats")
    .update(title === undefined ? { updated_at: new Date().toISOString() } : { title })
    .eq("id", chatId);
  if (error) console.error("Could not update chat:", error.message);
}

export async function loadMessages(chatId: string): Promise<VaultUIMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("status,message")
    .eq("chat_id", chatId)
    .order("position")
    .returns<MessageRow[]>();

  if (error) throw new Error(`Could not load chat: ${error.message}`);

  return (data ?? []).map(({ status, message }) =>
    status === "complete" ? message : { ...message, metadata: { status } },
  );
}

/** Update-by-id first so a continued turn overwrites its earlier half. */
export async function saveMessage(
  chatId: string,
  message: VaultUIMessage,
  status: NonNullable<ChatMessageMeta["status"]>,
): Promise<void> {
  if (message.role !== "user" && message.role !== "assistant") return;
  const supabase = await createClient();
  // The status column is authoritative; a stored copy of it would go stale.
  const stored = { ...message, metadata: undefined };

  const { data: updated, error: updateError } = await supabase
    .from("chat_messages")
    .update({ message: stored, status })
    .eq("chat_id", chatId)
    .eq("message->>id", message.id)
    .select("id");

  if (updateError) {
    console.error("Could not save chat message:", updateError.message);
    return;
  }
  if (updated && updated.length > 0) return;

  const { data: last } = await supabase
    .from("chat_messages")
    .select("position")
    .eq("chat_id", chatId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();

  const { error } = await supabase.from("chat_messages").insert({
    chat_id: chatId,
    position: (last?.position ?? -1) + 1,
    role: message.role,
    status,
    message: stored,
  });

  // A unique violation is two tabs racing; the other tab's turn stands.
  if (error) console.error("Could not save chat message:", error.message);
}

/** Everything stored is what happened; everything sent is what is valid. */
export function replayable(messages: VaultUIMessage[]): VaultUIMessage[] {
  return messages
    .filter(
      (message) =>
        message.role !== "system" &&
        (message.metadata?.status ?? "complete") === "complete",
    )
    .slice(-REPLAY_LIMIT);
}
