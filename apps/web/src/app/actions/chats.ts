"use server";

import type { VaultUIMessage } from "@/lib/chat";
import { findChat, getNoteId, loadMessages } from "@/lib/server/chats";
import { getUser } from "@/lib/server/supabase";

/** A note's stored thread, oldest first; empty when there is none yet. */
export async function loadChat(slug: string): Promise<VaultUIMessage[]> {
  if (!(await getUser())) return [];

  const noteId = await getNoteId(slug);
  if (!noteId) return [];

  const chatId = await findChat(noteId);
  if (!chatId) return [];

  return loadMessages(chatId);
}
