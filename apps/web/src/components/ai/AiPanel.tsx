"use client";

import { useEffect, useMemo, useState } from "react";
import { openChat, openFreeChat, openNoteChat } from "@/app/actions/chats";
import { useAiAssistant } from "@/components/ai/AiAssistantContext";
import { AiDiamond } from "@/components/ai/AiDiamond";
import { ChatHistory } from "@/components/ai/ChatHistory";
import {
  ConceptGraph,
  type ConceptGraphData,
} from "@/components/ai/ConceptGraph";
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
import { useLoadingIndicator } from "@/hooks/use-loading-indicator";
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
  resolver: Record<string, string>;
}) {
  const { open, setOpen } = useAiAssistant();
  const resolverMap = useMemo(
    () => new Map(Object.entries(resolver)),
    [resolver],
  );
  const slug = useNoteSlug();
  const focus = useGraphFocusState();

  const live: ChatSubject | null = slug
    ? { kind: "note", slug }
    : focus.slugs.length > 0
      ? { kind: "selection", slugs: focus.slugs }
      : null;

  // `wanted` loads behind the current view and swaps in whole, so nothing flickers.
  const [thread, setThread] = useState<OpenThread | null>(null);
  const [wanted, setWanted] = useState<{ subject: ChatSubject | null } | null>(
    { subject: live },
  );
  const [view, setView] = useState<"chat" | "history">("chat");
  const [fresh, setFresh] = useState(0);
  const [touched, setTouched] = useState(false);

  const historyOpen = view === "history";

  // A resumed thread's stored history is display, not engagement, so it stays untouched.
  const untouched = !touched;

  // Reopening starts the follow-the-reader cycle over, aimed at wherever they are now.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTouched(false);
      setView("chat");
      const showing = thread ? thread.subject : (wanted?.subject ?? null);
      if (subjectKey(live) !== subjectKey(showing)) {
        setWanted({ subject: live });
      }
    }
  }

  const liveKey = subjectKey(live);
  const [lastLiveKey, setLastLiveKey] = useState(liveKey);
  if (liveKey !== lastLiveKey) {
    setLastLiveKey(liveKey);
    if (live?.kind === "selection" && focus.from === "reader") {
      setThread({ chatId: null, subject: live, messages: [] });
      setWanted(null);
      setTouched(false);
      setView("chat");
    } else if (untouched && live?.kind === "note") {
      // Only a note re-aims an untouched thread; subjectless pages change nothing.
      setWanted({ subject: live });
      setView("chat");
    }
  }

  // Only a selection starts fresh: its identity changes with every pick.
  useEffect(() => {
    if (wanted === null) return;
    let alive = true;
    (async () => {
      const target = wanted.subject;
      const opened =
        target?.kind === "note"
          ? await openNoteChat(target.slug).catch(() => null)
          : target === null
            ? await openFreeChat().catch(() => null)
            : null;
      if (!alive) return;
      setThread({
        chatId: opened?.chatId ?? null,
        subject: target,
        messages: opened?.messages ?? [],
      });
      setTouched(false);
      setWanted(null);
    })();
    return () => {
      alive = false;
    };
  }, [wanted]);

  const subject = thread ? thread.subject : (wanted?.subject ?? null);
  const show = open;
  const slowLoad = useLoadingIndicator(thread === null);

  // About what the reader is looking at now — not the held thread's subject.
  function startNewChat() {
    setThread({ chatId: null, subject: live, messages: [] });
    setWanted(null);
    setTouched(false);
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
    setWanted(null);
    setTouched(false);
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
          {/* Closed, this edge sits on the header's seam, so it can claim one mid-slide. */}
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
              onActivity={() => setTouched(true)}
            />
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center">
              {slowLoad && <AiDiamond size={20} busy />}
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
  onActivity,
}: {
  thread: OpenThread;
  resolver: WikilinkResolver;
  show: boolean;
  onActivity: () => void;
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
  } = useNoteChat(thread, resolver, onActivity);

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
      <p className="ml-8 whitespace-pre-wrap bg-foreground/10 px-3 py-2">
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
      if (part.type === "tool-draw_graph") {
        const drawn = part as VaultToolPart;
        return drawn.state === "output-available" && drawn.output ? (
          <ConceptGraph key={index} data={drawn.output as ConceptGraphData} />
        ) : (
          <p key={index} className="text-xs italic opacity-50">
            Sketching a map…
          </p>
        );
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
    "tool-replace_in_note": (input) => `Change “${input.note ?? "a note"}”`,
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
    const diff =
      part.type === "tool-replace_in_note" && typeof input.find === "string"
        ? { from: String(input.find), to: String(input.replace ?? "") }
        : null;
    return (
      <WriteCard
        part={part}
        label={write(input)}
        preview={
          !diff && typeof (input.body ?? input.text) === "string"
            ? String(input.body ?? input.text)
            : null
        }
        diff={diff}
        failed={failed}
        error={typeof output.error === "string" ? output.error : part.errorText}
        onApproval={onApproval}
      />
    );
  }

  let label: string;
  switch (part.type) {
    case "tool-recent_changes":
      label = "Checked what changed lately";
      if (Array.isArray(output.notes)) label += ` — ${output.notes.length} notes`;
      break;
    case "tool-list_notes":
      label = input.folder ? `Listed “${input.folder}”` : "Listed the vault";
      if (typeof output.total === "number") label += ` — ${output.total} notes`;
      break;
    case "tool-list_tags":
      label = "Listed the tags";
      if (Array.isArray(output.tags)) label += ` — ${output.tags.length}`;
      break;
    case "tool-vault_health":
      label = "Checked the vault's health";
      if (Array.isArray(output.broken) && Array.isArray(output.orphans)) {
        label += ` — ${output.broken.length} broken links, ${output.orphans.length} orphans`;
      }
      break;
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

function WriteCard({
  part,
  label,
  preview,
  diff,
  failed,
  error,
  onApproval,
}: {
  part: VaultToolPart;
  label: string;
  preview: string | null;
  diff: { from: string; to: string } | null;
  failed: boolean;
  error: string | undefined;
  onApproval: ApprovalResponder;
}) {
  const pending = part.state === "approval-requested" && part.approval;
  const refused =
    part.state === "output-denied" || part.approval?.approved === false;

  return (
    <div className="not-prose border border-foreground/15 px-3 py-2 text-xs">
      <p className="font-semibold">{label}</p>
      {preview && (
        <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap bg-foreground/5 p-2 opacity-80">
          {preview}
        </pre>
      )}
      {diff && (
        <div className="mt-1 max-h-48 space-y-px overflow-auto">
          <pre className="whitespace-pre-wrap border-l-2 border-red-500/60 bg-red-500/10 p-2 opacity-80">
            {diff.from}
          </pre>
          <pre className="whitespace-pre-wrap border-l-2 border-green-600/60 bg-green-600/10 p-2 opacity-80">
            {diff.to}
          </pre>
        </div>
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
