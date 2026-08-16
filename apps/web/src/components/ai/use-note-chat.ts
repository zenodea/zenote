"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { loadChat } from "@/app/actions/chats";
import { useAiAssistant } from "@/components/ai/AiAssistantContext";
import { messageText, type ChatSubject, type VaultUIMessage } from "@/lib/chat";
import { setGraphFocus } from "@/lib/stores/graph-focus";
import { extractTargets, resolveWikilink } from "@/lib/wikilinks";
import type { WikilinkResolver } from "@/lib/wikilinks";

function resolveAll(targets: string[], resolver: WikilinkResolver): string[] {
  return [
    ...new Set(
      targets
        .map((target) => resolveWikilink(resolver, target))
        .filter((slug): slug is string => slug !== null),
    ),
  ];
}

/** One conversation about one subject; the caller remounts it when the subject changes. */
export function useNoteChat(subject: ChatSubject, resolver: WikilinkResolver) {
  const { setBusy } = useAiAssistant();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<VaultUIMessage>({
        api: "/api/chat",
        body: { subject },
      }),
    [subject],
  );

  type AddToolOutput = ReturnType<
    typeof useChat<VaultUIMessage>
  >["addToolOutput"];
  const addToolOutputRef = useRef<AddToolOutput | null>(null);

  const {
    messages,
    sendMessage,
    setMessages,
    addToolOutput,
    addToolApprovalResponse,
    status,
    stop,
    error,
  } = useChat<VaultUIMessage>({
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
        });
      },
      onFinish: ({ message }) => {
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

  // A note's thread is stored; pick it up where it was left.
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (fetchedRef.current || subject.kind !== "note") return;
    fetchedRef.current = true;
    let alive = true;
    loadChat(subject.slug)
      .then((history) => {
        if (!alive || history.length === 0) return;
        setMessages((current) => (current.length === 0 ? history : current));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [subject, setMessages]);

  useEffect(() => {
    setBusy(busy);
    return () => setBusy(false);
  }, [busy, setBusy]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    void sendMessage({ text });
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
    respondToApproval: addToolApprovalResponse,
  };
}
