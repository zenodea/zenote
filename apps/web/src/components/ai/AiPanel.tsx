"use client";

import { useEffect, useMemo, useState } from "react";
import { openChat, openNoteChat } from "@/app/actions/chats";
import { useAiAssistant } from "@/components/ai/AiAssistantContext";
import { AiDiamond } from "@/components/ai/AiDiamond";
import { ChatHistory } from "@/components/ai/ChatHistory";
import { useNoteChat, type OpenThread } from "@/components/ai/use-note-chat";
import { NoteMarkdown } from "@/components/note/NoteMarkdown";
import { Button } from "@/components/ui/Button";
import {
  CloseIcon,
  HistoryIcon,
  PlusIcon,
  SendIcon,
} from "@/components/ui/Icons";
import { Scroller } from "@/components/ui/Scroller";
import { useNoteSlug } from "@/hooks/use-note-slug";
import {
  messageText,
  subjectKey,
  type ChatSubject,
  type VaultUIMessage,
} from "@/lib/chat";
import { setGraphFocus, useGraphFocusState } from "@/lib/stores/graph-focus";
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
  const focus = useGraphFocusState();

  // A note when reading one, otherwise whatever is picked out on the graph.
  const live: ChatSubject | null = slug
    ? { kind: "note", slug }
    : focus.slugs.length > 0
      ? { kind: "selection", slugs: focus.slugs }
      : null;

  // What is on screen: null while a thread is being fetched. A thread opened
  // from history holds until the reader moves; only the reader re-aims it —
  // the assistant pointing the graph at its citations must not reset the
  // conversation that produced them.
  const [thread, setThread] = useState<OpenThread | null>(null);
  const [pending, setPending] = useState(live);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [fresh, setFresh] = useState(0);

  const historyOpen = view === "history";

  const liveKey = subjectKey(live);
  const [lastLiveKey, setLastLiveKey] = useState(liveKey);
  if ((slug !== null || focus.from === "reader") && liveKey !== lastLiveKey) {
    setLastLiveKey(liveKey);
    setPending(live);
    setThread(null);
    setView("chat");
  }

  // Resolve the pending subject into its most recent stored thread. Without a
  // subject the conversation is about the vault at large, fresh each time.
  useEffect(() => {
    if (thread !== null) return;
    let alive = true;
    (async () => {
      const opened =
        pending?.kind === "note"
          ? await openNoteChat(pending.slug).catch(() => null)
          : null;
      if (!alive) return;
      setThread({
        chatId: opened?.chatId ?? null,
        subject: pending,
        messages: opened?.messages ?? [],
      });
    })();
    return () => {
      alive = false;
    };
  }, [thread, pending]);

  const subject = thread ? thread.subject : pending;
  const show = open;

  function startNewChat() {
    setThread({ chatId: null, subject, messages: [] });
    setFresh((count) => count + 1);
    setView("chat");
  }

  async function openFromHistory(id: string) {
    const opened = await openChat(id).catch(() => null);
    if (!opened) return;
    setThread({
      chatId: opened.chatId,
      subject: opened.subject,
      messages: opened.messages,
    });
    // A reopened selection points the graph back at what it was about.
    if (opened.subject?.kind === "selection") {
      setGraphFocus(opened.subject.slugs, "assistant");
    }
    setView("chat");
  }

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
                  : "The whole vault"}
            </p>
          </div>
          <Button
            onClick={() => setView(view === "history" ? "chat" : "history")}
            active={view === "history"}
            aria-pressed={view === "history"}
            aria-label="Conversation history"
            title="Previous conversations"
            className="shrink-0"
          >
            <HistoryIcon />
          </Button>
          <Button
            onClick={startNewChat}
            aria-label="New conversation"
            title="Start a new conversation"
            className="shrink-0"
          >
            <PlusIcon />
          </Button>
          <Button
            onClick={() => setOpen(false)}
            aria-label="Close assistant"
            className="shrink-0"
          >
            <CloseIcon />
          </Button>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* The footer's slide, turned upside down: history descends from the
              header on a transform, so the conversation never reflows. */}
          {/* Seam claimed even mid-slide, unlike the footer: closed, this edge
              sits exactly on the header's seam, so its junction marks emerge
              from the header's diamonds and ride the edge down. */}
          <div
            data-seam={show ? "bottom" : undefined}
            className={`absolute inset-x-0 top-0 z-20 border-b border-foreground/15 bg-background transition-transform duration-300 ease-in-out ${
              historyOpen ? "translate-y-0" : "-translate-y-full"
            }`}
          >
            <Scroller
              className={`max-h-64 transition-opacity duration-200 ${
                historyOpen ? "opacity-100" : "opacity-0"
              }`}
              contentClassName="p-2"
            >
              <ChatHistory
                open={historyOpen}
                activeChatId={thread?.chatId ?? null}
                onOpen={openFromHistory}
                onDeleted={(id) => {
                  if (thread?.chatId === id) startNewChat();
                }}
              />
            </Scroller>
          </div>

          {thread ? (
            <ChatArea
              key={`${thread.chatId ?? subjectKey(thread.subject)}:${fresh}`}
              thread={thread}
              resolver={resolverMap}
              show={show}
            />
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <AiDiamond size={20} busy />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function ChatArea({
  thread,
  resolver,
  show,
}: {
  thread: OpenThread;
  resolver: WikilinkResolver;
  show: boolean;
}) {
  const subject = thread.subject ?? null;
  const {
    messages,
    input,
    setInput,
    busy,
    send,
    stop,
    error,
    scrollRef,
    respondToApproval,
  } = useNoteChat(thread, resolver);

  return (
    <>
      <Scroller
        scrollRef={scrollRef}
        className="min-h-0 flex-1"
        contentClassName="space-y-4 p-4"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-10 opacity-50">
            <AiDiamond size={24} />
            <p>
              {subject?.kind === "note"
                ? "Ask anything about this note"
                : subject
                  ? "Ask anything about what you have picked out"
                  : "Ask anything about your vault"}
            </p>
          </div>
        )}
        {messages.map((message, index) => (
          <Turn
            key={message.id}
            message={message}
            resolver={resolver}
            onApproval={respondToApproval}
            active={busy && index === messages.length - 1}
          />
        ))}
        {/* Before the stream opens there is no assistant message to render yet. */}
        {busy && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-2.5">
            <AiDiamond size={14} busy className="mt-1 shrink-0" />
            <p className="animate-pulse text-sm opacity-50">Thinking…</p>
          </div>
        )}
        {error && <p className="opacity-70">⚠️ {error.message}</p>}
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
              : subject
                ? "Ask about these notes…"
                : "Ask about your vault…"
          }
          aria-label="Message the assistant"
          className="min-w-0 flex-1 bg-transparent placeholder:opacity-50 focus:outline-none"
        />
        {busy ? (
          <Button
            type="button"
            onClick={() => void stop()}
            aria-label="Stop"
            className="shrink-0"
          >
            <CloseIcon />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={input.trim().length === 0}
            aria-label="Send"
            className="shrink-0"
          >
            <SendIcon />
          </Button>
        )}
      </form>
    </>
  );
}

type ApprovalResponder = (response: {
  id: string;
  approved: boolean;
}) => void | PromiseLike<void>;

function Turn({
  message,
  resolver,
  onApproval,
  active,
}: {
  message: VaultUIMessage;
  resolver: WikilinkResolver;
  onApproval: ApprovalResponder;
  active: boolean;
}) {
  if (message.role === "user") {
    return (
      <p className="ml-8 whitespace-pre-wrap rounded-lg bg-foreground/10 px-3 py-2">
        {messageText(message)}
      </p>
    );
  }

  const stopped = message.metadata?.status === "aborted";
  const parts = message.parts
    .map((part, index) => {
      if (part.type === "text") {
        return part.text ? (
          <NoteMarkdown key={index} source={part.text} resolver={resolver} />
        ) : null;
      }
      if (part.type.startsWith("tool-")) {
        return (
          <ToolLine
            key={index}
            part={part as VaultToolPart}
            onApproval={onApproval}
          />
        );
      }
      return null;
    })
    .filter(Boolean);

  return (
    <div className={`flex gap-2.5 ${stopped ? "opacity-50" : ""}`}>
      {/* The reply's mark: alive while this answer is still being written. */}
      <AiDiamond
        size={14}
        busy={active}
        className={`mt-1 shrink-0 ${active ? "" : "opacity-60"}`}
      />
      <div className="prose prose-sm min-w-0 max-w-none flex-1 space-y-2">
        {parts.length > 0 ? (
          parts
        ) : (
          <p className="animate-pulse opacity-50">Thinking…</p>
        )}
        {stopped && <p className="text-xs italic opacity-60">Stopped early.</p>}
      </div>
    </div>
  );
}

type VaultToolPart = {
  type: `tool-${string}`;
  state: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  approval?: { id: string; approved?: boolean };
};

const WRITE_LABELS: Record<string, (input: Record<string, unknown>) => string> =
  {
    "tool-create_note": (input) => `Create “${input.slug ?? "a note"}”`,
    "tool-append_to_note": (input) => `Add to “${input.note ?? "a note"}”`,
    "tool-move_note": (input) =>
      `Move “${input.note ?? "a note"}” into “${input.folder || "the vault root"}”`,
  };

function ToolLine({
  part,
  onApproval,
}: {
  part: VaultToolPart;
  onApproval: ApprovalResponder;
}) {
  const input = (part.input ?? {}) as Record<string, unknown>;
  const output = (part.output ?? {}) as Record<string, unknown>;
  const failed =
    part.state === "output-error" || typeof output.error === "string";

  const write = WRITE_LABELS[part.type];
  if (write) {
    return (
      <WriteCard
        part={part}
        label={write(input)}
        preview={
          typeof (input.body ?? input.text) === "string"
            ? String(input.body ?? input.text)
            : null
        }
        failed={failed}
        error={typeof output.error === "string" ? output.error : part.errorText}
        onApproval={onApproval}
      />
    );
  }

  let label: string;
  switch (part.type) {
    case "tool-search_notes":
      label = input.query
        ? `Searched the vault for “${input.query}”`
        : "Searching the vault…";
      if (Array.isArray(output.results)) {
        label += ` — ${output.results.length} found`;
      }
      break;
    case "tool-read_note":
      label = failed
        ? `Looked for “${input.note}” — not found`
        : input.note
          ? `Read “${(output.title as string) ?? input.note}”`
          : "Reading a note…";
      break;
    case "tool-neighbours":
      label = input.note
        ? `Followed the links around “${input.note}”`
        : "Following links…";
      break;
    case "tool-focus_graph":
      label = "Pointed the graph at the notes cited";
      break;
    default:
      label = "Working…";
  }

  return <p className="text-xs italic opacity-50">{label}</p>;
}

/** A proposed change to the vault; nothing runs until the reader says so. */
function WriteCard({
  part,
  label,
  preview,
  failed,
  error,
  onApproval,
}: {
  part: VaultToolPart;
  label: string;
  preview: string | null;
  failed: boolean;
  error: string | undefined;
  onApproval: ApprovalResponder;
}) {
  const pending = part.state === "approval-requested" && part.approval;
  const refused =
    part.state === "output-denied" || part.approval?.approved === false;

  return (
    <div className="not-prose rounded-lg border border-foreground/15 px-3 py-2 text-xs">
      <p className="font-semibold">{label}</p>
      {preview && (
        <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-foreground/5 p-2 opacity-80">
          {preview}
        </pre>
      )}
      {pending ? (
        <div className="mt-2 flex gap-2">
          <Button
            onClick={() => void onApproval({ id: part.approval!.id, approved: true })}
          >
            Approve
          </Button>
          <Button
            onClick={() =>
              void onApproval({ id: part.approval!.id, approved: false })
            }
          >
            Refuse
          </Button>
        </div>
      ) : (
        <p className="mt-1 italic opacity-60">
          {refused
            ? "Refused."
            : failed
              ? (error ?? "It did not work.")
              : part.state === "output-available"
                ? "Done."
                : "Waiting…"}
        </p>
      )}
    </div>
  );
}
