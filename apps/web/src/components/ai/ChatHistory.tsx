"use client";

import { useEffect, useState } from "react";
import {
  deleteChat,
  listChats,
  type ChatListing,
} from "@/app/actions/chats";
import { AiDiamond } from "@/components/ai/AiDiamond";
import { Button } from "@/components/ui/Button";
import { CloseIcon } from "@/components/ui/Icons";

function since(iso: string): string {
  const minutes = Math.max(0, (Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h ago`;
  if (minutes < 7 * 24 * 60) return `${Math.floor(minutes / (24 * 60))}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Every stored conversation, newest first; refetched each time the drawer opens. */
export function ChatHistory({
  open,
  activeChatId,
  onOpen,
  onDeleted,
}: {
  open: boolean;
  activeChatId: string | null;
  onOpen: (id: string) => void;
  onDeleted: (id: string) => void;
}) {
  const [chats, setChats] = useState<ChatListing[] | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    listChats()
      .then((rows) => alive && setChats(rows))
      .catch(() => alive && setChats([]));
    return () => {
      alive = false;
    };
  }, [open]);

  async function remove(id: string) {
    setChats((current) => current?.filter((chat) => chat.id !== id) ?? null);
    await deleteChat(id).catch(() => {});
    onDeleted(id);
  }

  if (chats === null) {
    return (
      <p className="flex items-center gap-2 px-2 py-2 text-xs opacity-50">
        <AiDiamond size={12} busy />
        Looking back…
      </p>
    );
  }

  if (chats.length === 0) {
    return <p className="px-2 py-2 opacity-50">No conversations yet</p>;
  }

  return (
    <>
      {chats.map((chat) => (
        <div
          key={chat.id}
          className={`group flex items-center gap-1 rounded-lg ${
            chat.id === activeChatId
              ? "bg-foreground/10"
              : "hover:bg-foreground/5"
          }`}
        >
          <button
            type="button"
            onClick={() => onOpen(chat.id)}
            className="min-w-0 flex-1 px-2 py-1.5 text-left"
          >
            <p className="truncate">
              {chat.title || chat.noteTitle || "Untitled"}
            </p>
            <p className="truncate text-xs opacity-60">
              {chat.noteTitle ?? "No note"} · {since(chat.updated)}
            </p>
          </button>
          <Button
            onClick={() => void remove(chat.id)}
            aria-label={`Delete “${chat.title || chat.noteTitle || "Untitled"}”`}
            className="shrink-0 opacity-0 group-hover:opacity-100"
          >
            <CloseIcon />
          </Button>
        </div>
      ))}
    </>
  );
}
