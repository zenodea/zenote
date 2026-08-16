"use client";

import { useMemo, useState } from "react";
import { useAiAssistant } from "@/components/ai/AiAssistantContext";
import { useNoteChat } from "@/components/ai/use-note-chat";
import { NoteMarkdown } from "@/components/note/NoteMarkdown";
import { Button } from "@/components/ui/Button";
import { CloseIcon, SendIcon } from "@/components/ui/Icons";
import { Scroller } from "@/components/ui/Scroller";
import { useNoteSlug } from "@/hooks/use-note-slug";
import {
  messageText,
  subjectKey,
  type ChatSubject,
  type VaultUIMessage,
} from "@/lib/chat";
import { useGraphFocusState } from "@/lib/stores/graph-focus";
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

  // Re-aimed only by the reader. The assistant points the graph at the notes it
  // just cited, and taking that as a new subject would reset the conversation
  // that produced it.
  const [subject, setSubject] = useState(live);
  if (
    (slug !== null || focus.from === "reader") &&
    subjectKey(live) !== subjectKey(subject)
  ) {
    setSubject(live);
  }

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

        {subject && (
          <ChatArea
            key={subjectKey(subject)}
            subject={subject}
            resolver={resolverMap}
            show={show}
          />
        )}
      </div>
    </aside>
  );
}

function ChatArea({
  subject,
  resolver,
  show,
}: {
  subject: ChatSubject;
  resolver: WikilinkResolver;
  show: boolean;
}) {
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
  } = useNoteChat(subject, resolver);

  return (
    <>
      <Scroller
        scrollRef={scrollRef}
        className="min-h-0 flex-1"
        contentClassName="space-y-4 p-4"
      >
        {messages.length === 0 && (
          <p className="opacity-50">
            {subject.kind === "note"
              ? "Ask anything about this note"
              : "Ask anything about what you have picked out"}
          </p>
        )}
        {messages.map((message) => (
          <Turn
            key={message.id}
            message={message}
            resolver={resolver}
            onApproval={respondToApproval}
          />
        ))}
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
            subject.kind === "note"
              ? "Ask about this note…"
              : "Ask about these notes…"
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
}: {
  message: VaultUIMessage;
  resolver: WikilinkResolver;
  onApproval: ApprovalResponder;
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
    <div
      className={`prose prose-sm max-w-none space-y-2 ${stopped ? "opacity-50" : ""}`}
    >
      {parts.length > 0 ? (
        parts
      ) : (
        <p className="animate-pulse opacity-50">Thinking…</p>
      )}
      {stopped && <p className="text-xs italic opacity-60">Stopped early.</p>}
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
