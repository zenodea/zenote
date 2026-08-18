"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { createChat } from "@/app/actions/chats";
import { useAiAssistant } from "@/components/ai/AiAssistantContext";
import { useLatestRef } from "@/hooks/use-latest-ref";
import { useLinger } from "@/hooks/use-linger";
import type { ChatSubject, VaultUIMessage } from "@/lib/chat";
import { useSettings } from "@/lib/stores/settings";
import { vaultStore } from "@/lib/vault/store";
import { pullOnce } from "@/lib/vault/sync";

export type OpenThread = {
  chatId: string | null;
  subject: ChatSubject | null;
  messages: VaultUIMessage[];
};

const SETTLE_MS = 400;

const WRITE_TOOLS = new Set([
  "tool-create_note",
  "tool-append_to_note",
  "tool-replace_in_note",
  "tool-move_note",
]);

export function useNoteChat(thread: OpenThread, onActivity?: () => void) {
  const { setBusy } = useAiAssistant();
  const settingsRef = useLatestRef(useSettings());
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const chatIdRef = useRef(thread.chatId);

  function requestBody() {
    return {
      vaultId: vaultStore.get().vault?.id,
      subject: thread.subject,
      chatId: chatIdRef.current,
      allowWrites: settingsRef.current.aiWrites,
      notesOnly: settingsRef.current.aiVaultOnly,
    };
  }

  const transport = useMemo(
    () =>
      new DefaultChatTransport<VaultUIMessage>({
        api: "/api/chat",
        body: {
          vaultId: vaultStore.get().vault?.id,
          subject: thread.subject,
          chatId: thread.chatId,
        },
      }),
    [thread],
  );

  const { messages, sendMessage, addToolApprovalResponse, status, stop, error } =
    useChat<VaultUIMessage>({
      messages: thread.messages,
      transport,
      sendAutomaticallyWhen: (options) =>
        lastAssistantMessageIsCompleteWithToolCalls(options) ||
        lastAssistantMessageIsCompleteWithApprovalResponses(options),
      onFinish: ({ message }) => {
        const wrote = message.parts.some(
          (part) =>
            WRITE_TOOLS.has(part.type) &&
            (part as { state?: string }).state === "output-available",
        );
        if (wrote) void pullOnce();
      },
    });

  const streaming = status === "submitted" || status === "streaming";
  const busy = useLinger(streaming, SETTLE_MS);

  const latestStop = useLatestRef(stop);
  useEffect(() => () => void latestStop.current(), [latestStop]);

  useEffect(() => {
    setBusy(busy);
    return () => setBusy(false);
  }, [busy, setBusy]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    onActivity?.();
    if (!chatIdRef.current) {
      const vaultId = vaultStore.get().vault?.id;
      chatIdRef.current = vaultId
        ? await createChat(vaultId, thread.subject).catch(() => null)
        : null;
    }
    void sendMessage({ text }, { body: requestBody() });
  }

  function respondToApproval(response: { id: string; approved: boolean }) {
    return addToolApprovalResponse({
      ...response,
      options: { body: requestBody() },
    });
  }

  return {
    messages,
    input,
    setInput,
    busy,
    send,
    stop,
    error,
    scrollRef,
    respondToApproval,
  };
}
