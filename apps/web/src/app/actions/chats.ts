"use server";

import type { ChatSubject, VaultUIMessage } from "@/lib/chat";
import {
  getChat,
  getNoteId,
  insertChat,
  latestChatId,
  latestFreeChatId,
  loadMessages,
} from "@/lib/server/chats";
import { createClient, getUser } from "@/lib/server/supabase";

export type ChatListing = {
  id: string;
  title: string;
  updated: string;
  noteTitle: string | null;
  noteCount: number | null;
};

export type OpenedChat = {
  chatId: string;
  subject: ChatSubject | null;
  messages: VaultUIMessage[];
};

export async function listChats(vaultId: string): Promise<ChatListing[]> {
  if (!(await getUser())) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chats")
    .select("id,title,updated_at,note_ids,notes(title)")
    .eq("vault_id", vaultId)
    .order("updated_at", { ascending: false })
    .returns<
      {
        id: string;
        title: string;
        updated_at: string;
        note_ids: string[] | null;
        notes: { title: string } | null;
      }[]
    >();

  if (error) throw new Error(`Could not list chats: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    updated: row.updated_at,
    noteTitle: row.notes?.title ?? null,
    noteCount: row.note_ids?.length ?? null,
  }));
}

export async function openNoteChat(
  vaultId: string,
  slug: string,
): Promise<OpenedChat | null> {
  if (!(await getUser())) return null;

  const noteId = await getNoteId(vaultId, slug);
  const chatId = noteId ? await latestChatId(noteId) : null;
  if (!chatId) return null;

  return {
    chatId,
    subject: { kind: "note", slug },
    messages: await loadMessages(chatId),
  };
}

export async function openFreeChat(
  vaultId: string,
): Promise<OpenedChat | null> {
  if (!(await getUser())) return null;

  const chatId = await latestFreeChatId(vaultId);
  if (!chatId) return null;

  return { chatId, subject: null, messages: await loadMessages(chatId) };
}

export async function openChat(chatId: string): Promise<OpenedChat | null> {
  if (!(await getUser())) return null;

  const chat = await getChat(chatId);
  if (!chat) return null;

  const supabase = await createClient();
  let subject: ChatSubject | null = null;

  if (chat.note_id) {
    const { data } = await supabase
      .from("notes")
      .select("slug")
      .eq("id", chat.note_id)
      .maybeSingle<{ slug: string }>();
    if (!data) return null;
    subject = { kind: "note", slug: data.slug };
  } else if (chat.note_ids && chat.note_ids.length > 0) {
    const { data } = await supabase
      .from("notes")
      .select("slug")
      .in("id", chat.note_ids)
      .returns<{ slug: string }[]>();
    const slugs = (data ?? []).map((row) => row.slug);
    if (slugs.length === 0) return null;
    subject = { kind: "selection", slugs };
  }

  return { chatId, subject, messages: await loadMessages(chatId) };
}

export async function createChat(
  vaultId: string,
  subject: ChatSubject | null,
): Promise<string | null> {
  if (!(await getUser())) return null;

  if (subject === null) return insertChat(vaultId, {});

  if (subject.kind === "note") {
    const noteId = await getNoteId(vaultId, subject.slug);
    return noteId ? insertChat(vaultId, { note_id: noteId }) : null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("notes")
    .select("id")
    .eq("vault_id", vaultId)
    .in("slug", subject.slugs)
    .returns<{ id: string }[]>();
  const ids = (data ?? []).map((row) => row.id);
  return ids.length > 0 ? insertChat(vaultId, { note_ids: ids }) : null;
}

export async function deleteChat(chatId: string): Promise<{ error?: string }> {
  if (!(await getUser())) return { error: "Not signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("chats").delete().eq("id", chatId);
  return error ? { error: error.message } : {};
}
