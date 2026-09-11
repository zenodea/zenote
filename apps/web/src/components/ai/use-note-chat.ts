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
import { aiCredentials, settingsStore } from "@/lib/stores/settings";
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

function chatTransport(subject: ChatSubject | null, chatId: string | null) {
  const requestBody = () => {
    const settings = settingsStore.get();
    return {
      vaultId: vaultStore.get().vault?.id,
      subject,
      chatId,
      allowWrites: settings.aiWrites,
      notesOnly: settings.aiVaultOnly,
      ...aiCredentials(settings),
    };
  };

  return new DefaultChatTransport<VaultUIMessage>({
    api: "/api/chat",
    prepareSendMessagesRequest: ({
      id,
      messages,
      trigger,
      messageId,
      body,
    }) => ({
      body: { ...requestBody(), ...body, id, messages, trigger, messageId },
    }),
  });
}

export function useNoteChat(thread: OpenThread, onActivity?: () => void) {
  const { setBusy } = useAiAssistant();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const [chatId, setChatId] = useState(thread.chatId);

  const transport = useMemo(
    () => chatTransport(thread.subject, chatId),
    [thread.subject, chatId],
  );

  const {
    messages,
    sendMessage,
    addToolApprovalResponse,
    status,
    stop,
    error,
  } = useChat<VaultUIMessage>({
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

  // Opened threads settle their layout (markdown, graphs) after first paint.
  useEffect(() => {
    let raf = 0;
    let tries = 0;
    const settle = () => {
      const area = scrollRef.current;
      if (area) area.scrollTo({ top: area.scrollHeight });
      if (tries++ < 8) raf = requestAnimationFrame(settle);
    };
    raf = requestAnimationFrame(settle);
    return () => cancelAnimationFrame(raf);
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    onActivity?.();
    let open = chatId;
    if (!open) {
      const vaultId = vaultStore.get().vault?.id;
      open = vaultId
        ? await createChat(vaultId, thread.subject).catch(() => null)
        : null;
      setChatId(open);
    }
    void sendMessage({ text }, { body: { chatId: open } });
  }

  function respondToApproval(response: { id: string; approved: boolean }) {
    return addToolApprovalResponse(response);
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
