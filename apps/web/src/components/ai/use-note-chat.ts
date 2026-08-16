"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { createChat } from "@/app/actions/chats";
import { useAiAssistant } from "@/components/ai/AiAssistantContext";
import { useLatestRef } from "@/hooks/use-latest-ref";
import { messageText, type ChatSubject, type VaultUIMessage } from "@/lib/chat";
import { useSettings } from "@/lib/stores/settings";
import { setGraphFocus } from "@/lib/stores/graph-focus";
import { extractTargets, resolveWikilink } from "@/lib/wikilinks";
import type { WikilinkResolver } from "@/lib/wikilinks";

/** A conversation on screen: its stored thread, its subject, and what was said.
 * A null subject is the vault at large. */
export type OpenThread = {
  chatId: string | null;
  subject: ChatSubject | null;
  messages: VaultUIMessage[];
};

const WRITE_TOOLS = new Set([
  "tool-create_note",
  "tool-append_to_note",
  "tool-move_note",
]);

function resolveAll(targets: string[], resolver: WikilinkResolver): string[] {
  return [
    ...new Set(
      targets
        .map((target) => resolveWikilink(resolver, target))
        .filter((slug): slug is string => slug !== null),
    ),
  ];
}

/** One conversation; the caller remounts it when the thread changes. */
export function useNoteChat(
  thread: OpenThread,
  resolver: WikilinkResolver,
  onActivity?: () => void,
) {
  const { setBusy } = useAiAssistant();
  const router = useRouter();
  const settingsRef = useLatestRef(useSettings());
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Minted on the first send; every request reads it at call time.
  const chatIdRef = useRef(thread.chatId);

  // Assembled at call time so the chat id and preferences are never stale.
  function requestBody() {
    return {
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
        body: { subject: thread.subject, chatId: thread.chatId },
      }),
    [thread],
  );

  type AddToolOutput = ReturnType<
    typeof useChat<VaultUIMessage>
  >["addToolOutput"];
  const addToolOutputRef = useRef<AddToolOutput | null>(null);

  const {
    messages,
    sendMessage,
    addToolOutput,
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
      // The model aims the graph by name; the browser owns the graph, so it answers.
      onToolCall: ({ toolCall }) => {
        if (toolCall.toolName !== "focus_graph") return;
        const targets = (toolCall.input as { notes?: string[] })?.notes ?? [];
        const slugs = resolveAll(targets, resolver);
        if (slugs.length > 0) setGraphFocus(slugs, "assistant");
        void addToolOutputRef.current?.({
          tool: "focus_graph",
          toolCallId: toolCall.toolCallId,
          output: { focused: slugs },
          options: { body: requestBody() },
        });
      },
      onFinish: ({ message }) => {
        // An approved write changed the vault; the chrome re-reads it so new
        // notes appear and their wikilinks resolve without a manual reload.
        const wrote = message.parts.some(
          (part) =>
            WRITE_TOOLS.has(part.type) &&
            (part as { state?: string }).state === "output-available",
        );
        if (wrote) router.refresh();

        // When the model didn't aim the graph itself, its citations do.
        const aimed = message.parts.some(
          (part) => part.type === "tool-focus_graph",
        );
        if (aimed) return;
        const cited = resolveAll(extractTargets(messageText(message)), resolver);
        if (cited.length > 0) setGraphFocus(cited, "assistant");
      },
    });

  useEffect(() => {
    addToolOutputRef.current = addToolOutput;
  }, [addToolOutput]);

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    setBusy(busy);
    return () => setBusy(false);
  }, [busy, setBusy]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    onActivity?.();
    // A fresh thread gets its row on first send, so empty chats never exist.
    if (!chatIdRef.current) {
      chatIdRef.current = await createChat(thread.subject).catch(() => null);
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
