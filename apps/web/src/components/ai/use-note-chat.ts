"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { loadChat } from "@/app/actions/chats";
import { useAiAssistant } from "@/components/ai/AiAssistantContext";
import { messageText, type ChatSubject, type VaultUIMessage } from "@/lib/chat";
import { setGraphFocus } from "@/lib/stores/graph-focus";
import { extractTargets, resolveWikilink } from "@/lib/wikilinks";
import type { WikilinkResolver } from "@/lib/wikilinks";

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

  const { messages, sendMessage, setMessages, status, stop, error } =
    useChat<VaultUIMessage>({
      transport,
      onFinish: ({ message }) => {
        // The notes it cited become the graph's focus: the answer shows its sources.
        const cited = extractTargets(messageText(message))
          .map((target) => resolveWikilink(resolver, target))
          .filter((slug): slug is string => slug !== null);
        if (cited.length > 0) setGraphFocus([...new Set(cited)], "assistant");
      },
    });

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

  return { messages, input, setInput, busy, send, stop, error, scrollRef };
}
