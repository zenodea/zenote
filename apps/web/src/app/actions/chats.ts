"use server";

import type { VaultUIMessage } from "@/lib/chat";
import {
  getChat,
  getNoteId,
  insertChat,
  latestChatId,
  loadMessages,
} from "@/lib/server/chats";
import { createClient, getUser } from "@/lib/server/supabase";

export type ChatListing = {
  id: string;
  title: string;
  updated: string;
  noteSlug: string | null;
  noteTitle: string | null;
};

export type OpenedChat = {
  chatId: string;
  noteSlug: string | null;
  messages: VaultUIMessage[];
};

/** Every stored conversation, newest first, for the history view. */
export async function listChats(): Promise<ChatListing[]> {
  if (!(await getUser())) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chats")
    .select("id,title,updated_at,notes(slug,title)")
    .order("updated_at", { ascending: false })
    .returns<
      {
        id: string;
        title: string;
        updated_at: string;
        notes: { slug: string; title: string } | null;
      }[]
    >();

  if (error) throw new Error(`Could not list chats: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    updated: row.updated_at,
    noteSlug: row.notes?.slug ?? null,
    noteTitle: row.notes?.title ?? null,
  }));
}

/** A note's most recent thread; null when it has none yet. */
export async function openNoteChat(slug: string): Promise<OpenedChat | null> {
  if (!(await getUser())) return null;

  const noteId = await getNoteId(slug);
  const chatId = noteId ? await latestChatId(noteId) : null;
  if (!chatId) return null;

  return { chatId, noteSlug: slug, messages: await loadMessages(chatId) };
}

export async function openChat(chatId: string): Promise<OpenedChat | null> {
  if (!(await getUser())) return null;

  const chat = await getChat(chatId);
  if (!chat) return null;

  let noteSlug: string | null = null;
  if (chat.note_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("notes")
      .select("slug")
      .eq("id", chat.note_id)
      .maybeSingle<{ slug: string }>();
    noteSlug = data?.slug ?? null;
  }

  return { chatId, noteSlug, messages: await loadMessages(chatId) };
}

/** Called on the first send of a fresh thread, so empty chats never exist. */
export async function createChat(slug: string): Promise<string | null> {
  if (!(await getUser())) return null;

  const noteId = await getNoteId(slug);
  return noteId ? insertChat(noteId) : null;
}

export async function deleteChat(chatId: string): Promise<void> {
  if (!(await getUser())) return;

  const supabase = await createClient();
  const { error } = await supabase.from("chats").delete().eq("id", chatId);
  if (error) console.error("Could not delete chat:", error.message);
}
