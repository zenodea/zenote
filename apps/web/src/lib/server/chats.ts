import "server-only";
import type { ChatMessageMeta, VaultUIMessage } from "../chat";
import { createClient } from "./supabase";

type MessageRow = {
  status: NonNullable<ChatMessageMeta["status"]>;
  message: VaultUIMessage;
};

const REPLAY_LIMIT = 30;

export type ChatRow = {
  id: string;
  title: string;
  note_id: string | null;
  note_ids: string[] | null;
};

export async function getNoteId(
  vaultId: string,
  slug: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notes")
    .select("id")
    .eq("vault_id", vaultId)
    .eq("slug", slug)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

export async function getChat(chatId: string): Promise<ChatRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chats")
    .select("id,title,note_id,note_ids")
    .eq("id", chatId)
    .maybeSingle<ChatRow>();
  return data;
}

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

export async function latestFreeChatId(
  vaultId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chats")
    .select("id")
    .eq("vault_id", vaultId)
    .is("note_id", null)
    .is("note_ids", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

export async function insertChat(
  vaultId: string,
  fields: {
    note_id?: string;
    note_ids?: string[];
  },
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chats")
    .insert({ ...fields, vault_id: vaultId })
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error) console.error("Could not open chat:", error.message);
  return data?.id ?? null;
}

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

  const rows = data ?? [];
  const last = new Map<string, number>();
  rows.forEach((row, index) => last.set(row.message.id, index));

  return rows
    .filter((row, index) => last.get(row.message.id) === index)
    .map(({ status, message }) =>
      status === "complete" ? message : { ...message, metadata: { status } },
    )
    .map(retire)
    .filter((message) => message.parts.length > 0);
}

const RETIRED_TOOLS = new Set(["tool-focus_graph"]);

function retire(message: VaultUIMessage): VaultUIMessage {
  if (!message.parts.some((part) => RETIRED_TOOLS.has(part.type))) {
    return message;
  }
  return {
    ...message,
    parts: message.parts.filter((part) => !RETIRED_TOOLS.has(part.type)),
  };
}

export async function saveMessage(
  chatId: string,
  message: VaultUIMessage,
  status: NonNullable<ChatMessageMeta["status"]>,
): Promise<void> {
  if (message.role !== "user" && message.role !== "assistant") return;
  const supabase = await createClient();
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

  if (error) console.error("Could not save chat message:", error.message);
}

export function replayable(messages: VaultUIMessage[]): VaultUIMessage[] {
  return messages
    .filter(
      (message) =>
        message.role !== "system" &&
        (message.metadata?.status ?? "complete") === "complete",
    )
    .slice(-REPLAY_LIMIT);
}
