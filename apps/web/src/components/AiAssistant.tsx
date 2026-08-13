"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/Button";
import { CloseIcon, SendIcon, SparkleIcon } from "@/components/ui/Icons";

type ChatMessage = { role: "user" | "assistant"; content: string };

type AiAssistantState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
};

const AiAssistantContext = createContext<AiAssistantState | null>(null);

function useAiAssistant(): AiAssistantState {
  const state = useContext(AiAssistantContext);
  if (!state) {
    throw new Error("AiAssistant components need an <AiAssistantProvider>.");
  }
  return state;
}

// Slug of the note being read, or null outside note pages.
function useNoteSlug(): string | null {
  const pathname = usePathname();
  if (!pathname.startsWith("/notes/")) return null;
  return decodeURIComponent(pathname.slice("/notes/".length));
}

export function AiAssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const pathname = usePathname();

  // Navigating to another note switches the assistant off. State is adjusted
  // during render (the documented alternative to a setState-in-effect).
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  return (
    <AiAssistantContext.Provider value={{ open, setOpen, busy, setBusy }}>
      {children}
    </AiAssistantContext.Provider>
  );
}

export function AiButton() {
  const { open, setOpen, busy } = useAiAssistant();
  const slug = useNoteSlug();

  return (
    <Button
      onClick={() => setOpen(!open)}
      disabled={!slug}
      active={open}
      aria-pressed={open}
      aria-label={open ? "Close AI assistant" : "Ask AI about this note"}
      title={
        slug ? "Ask AI about this note" : "Open a note to use the AI assistant"
      }
      className={open && busy ? "animate-pulse" : undefined}
    >
      <SparkleIcon />
    </Button>
  );
}

export function AiPanel({ titles }: { titles: Record<string, string> }) {
  const { open, setOpen, setBusy } = useAiAssistant();
  const slug = useNoteSlug();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setLocalBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const show = open && slug !== null;

  // A conversation belongs to one note; reset when the note changes.
  const [lastSlug, setLastSlug] = useState(slug);
  if (slug !== lastSlug) {
    setLastSlug(slug);
    setMessages([]);
    abortRef.current?.abort();
  }

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
    if (!text || busy || !slug) return;

    const history = [...messages, { role: "user" as const, content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    markBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, messages: history }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(await response.text());
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        appendToReply(decoder.decode(value, { stream: true }));
      }
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
              {slug ? (titles[slug] ?? slug) : ""}
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

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4"
        >
          {messages.length === 0 && (
            <p className="opacity-50">Ask anything about this note</p>
          )}
          {messages.map((message, index) =>
            message.role === "user" ? (
              <p
                key={index}
                className="ml-8 whitespace-pre-wrap rounded-lg bg-foreground/10 px-3 py-2"
              >
                {message.content}
              </p>
            ) : (
              <div key={index} className="prose prose-sm max-w-none">
                {message.content ? (
                  <Markdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </Markdown>
                ) : (
                  <p className="animate-pulse opacity-50">Thinking…</p>
                )}
              </div>
            ),
          )}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
          data-seam={show ? "top" : undefined}
          // h-[45px]: 44px row + 1px border, level with the other footers.
          className="flex h-[45px] shrink-0 items-center gap-2 border-t border-foreground/15 px-3"
        >
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about this note…"
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



