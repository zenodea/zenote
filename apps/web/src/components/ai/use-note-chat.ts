"use client";

import { useEffect, useRef, useState } from "react";
import { useAiAssistant } from "@/components/ai/AiAssistantContext";
import {
  streamPlainText,
  subjectKey,
  type ChatMessage,
  type ChatRequest,
  type ChatSubject,
} from "@/lib/chat";
import { setGraphFocus } from "@/lib/stores/graph-focus";
import { extractTargets, resolveWikilink } from "@/lib/wikilinks";
import type { WikilinkResolver } from "@/lib/wikilinks";

export function useNoteChat(
  subject: ChatSubject | null,
  resolver: WikilinkResolver,
) {
  const { setBusy } = useAiAssistant();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setLocalBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // A conversation belongs to one subject; reset when the subject changes.
  const key = subjectKey(subject);
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setMessages([]);
  }

  useEffect(() => {
    abortRef.current?.abort();
  }, [key]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  function markBusy(value: boolean) {
    setLocalBusy(value);
    setBusy(value);
  }

  function appendToReply(chunk: string) {
    setMessages((previous) => {
      const last = previous[previous.length - 1];
      if (!last || last.role !== "assistant") return previous;
      return [
        ...previous.slice(0, -1),
        { ...last, content: last.content + chunk },
      ];
    });
  }

  async function send() {
    const text = input.trim();
    if (!text || busy || !subject) return;

    const history = [...messages, { role: "user" as const, content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    markBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const payload: ChatRequest = { subject, messages: history };

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (response.status === 401) {
        throw new Error("Your session has expired. Reload and sign in again.");
      }
      if (!response.ok || !response.body) {
        throw new Error(await response.text());
      }
      // Anything but text/plain means we followed a redirect into a page.
      if (!response.headers.get("content-type")?.startsWith("text/plain")) {
        throw new Error("Unexpected reply from the server.");
      }

      let answer = "";
      await streamPlainText(response.body, (chunk) => {
        answer += chunk;
        appendToReply(chunk);
      });

      // The notes it cited become the graph's focus: the answer shows its sources.
      const cited = extractTargets(answer)
        .map((target) => resolveWikilink(resolver, target))
        .filter((slug): slug is string => slug !== null);
      if (cited.length > 0) setGraphFocus([...new Set(cited)], "assistant");
    } catch (error) {
      if (!controller.signal.aborted) {
        appendToReply(
          `⚠️ ${error instanceof Error && error.message ? error.message : "Something went wrong."}`,
        );
      }
    } finally {
      markBusy(false);
    }
  }

  return { messages, input, setInput, busy, send, scrollRef };
}
