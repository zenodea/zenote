"use client";

import { useMemo } from "react";
import { useAiAssistant } from "@/components/ai/AiAssistantContext";
import { useNoteChat } from "@/components/ai/use-note-chat";
import { NoteMarkdown } from "@/components/note/NoteMarkdown";
import { Button } from "@/components/ui/Button";
import { CloseIcon, SendIcon } from "@/components/ui/Icons";
import { Scroller } from "@/components/ui/Scroller";
import { useNoteSlug } from "@/hooks/use-note-slug";
import type { ChatMessage, ChatSubject } from "@/lib/chat";
import { useGraphFocus } from "@/lib/stores/graph-focus";
import type { WikilinkResolver } from "@/lib/wikilinks";

export function AiPanel({
  titles,
  resolver,
}: {
  titles: Record<string, string>;
  /** Cited notes render as the same wikilinks the notes themselves use. */
  resolver: Record<string, string>;
}) {
  const { open, setOpen } = useAiAssistant();
  const resolverMap = useMemo(
    () => new Map(Object.entries(resolver)),
    [resolver],
  );
  const slug = useNoteSlug();
  const selection = useGraphFocus();

  // A note when reading one, otherwise whatever is picked out on the graph.
  const subject: ChatSubject | null = slug
    ? { kind: "note", slug }
    : selection.length > 0
      ? { kind: "selection", slugs: selection }
      : null;

  const { messages, input, setInput, busy, send, scrollRef } = useNoteChat(
    subject,
    resolverMap,
  );

  const show = open && subject !== null;

  return (
    <aside
      aria-hidden={!show}
      aria-label="AI assistant"
      className={`shrink-0 overflow-hidden transition-[width] duration-300 ${
        show ? "w-96" : "w-0"
      }`}
    >
      <div
        data-seam={show ? "left" : undefined}
        className="flex h-full w-96 flex-col border-l border-foreground/15 text-sm"
      >
        <div
          data-seam={show ? "bottom" : undefined}
          className="flex h-14 shrink-0 items-center gap-2 border-b border-foreground/15 px-4"
        >
          <div className="min-w-0 flex-1">
            <p className="font-semibold">AI Assistant</p>
            <p className="truncate text-xs opacity-60">
              {subject?.kind === "note"
                ? (titles[subject.slug] ?? subject.slug)
                : subject
                  ? `${subject.slugs.length} notes on the graph`
                  : ""}
            </p>
          </div>
          <Button
            onClick={() => setOpen(false)}
            aria-label="Close assistant"
            className="shrink-0"
          >
            <CloseIcon />
          </Button>
        </div>

        <Scroller
          scrollRef={scrollRef}
          className="min-h-0 flex-1"
          contentClassName="space-y-4 p-4"
        >
          {messages.length === 0 && (
            <p className="opacity-50">
              {subject?.kind === "note"
                ? "Ask anything about this note"
                : "Ask anything about what you have picked out"}
            </p>
          )}
          {messages.map((message, index) => (
            <Turn key={index} message={message} resolver={resolverMap} />
          ))}
        </Scroller>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
          data-seam={show ? "top" : undefined}
          className="flex h-[45px] shrink-0 items-center gap-2 border-t border-foreground/15 px-3"
        >
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={
              subject?.kind === "note"
                ? "Ask about this note…"
                : "Ask about these notes…"
            }
            aria-label="Message the assistant"
            className="min-w-0 flex-1 bg-transparent placeholder:opacity-50 focus:outline-none"
          />
          <Button
            type="submit"
            disabled={busy || input.trim().length === 0}
            aria-label="Send"
            className="shrink-0"
          >
            <SendIcon />
          </Button>
        </form>
      </div>
    </aside>
  );
}

function Turn({
  message,
  resolver,
}: {
  message: ChatMessage;
  resolver: WikilinkResolver;
}) {
  if (message.role === "user") {
    return (
      <p className="ml-8 whitespace-pre-wrap rounded-lg bg-foreground/10 px-3 py-2">
        {message.content}
      </p>
    );
  }

  return (
    <div className="prose prose-sm max-w-none">
      {message.content ? (
        <NoteMarkdown source={message.content} resolver={resolver} />
      ) : (
        <p className="animate-pulse opacity-50">Thinking…</p>
      )}
    </div>
  );
}
