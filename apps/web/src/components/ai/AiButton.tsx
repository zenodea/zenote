"use client";

import { useAiAssistant } from "@/components/ai/AiAssistantContext";
import { Button } from "@/components/ui/Button";
import { SparkleIcon } from "@/components/ui/Icons";
import { useNoteSlug } from "@/hooks/use-note-slug";
import { useGraphFocus } from "@/lib/stores/graph-focus";

export function AiButton() {
  const { open, setOpen, busy } = useAiAssistant();
  const slug = useNoteSlug();
  const selection = useGraphFocus();
  const subject = slug !== null || selection.length > 0;

  return (
    <Button
      onClick={() => setOpen(!open)}
      disabled={!subject}
      active={open}
      aria-pressed={open}
      aria-label={open ? "Close AI assistant" : "Ask AI"}
      title={
        subject
          ? "Ask AI about what you are looking at"
          : "Open a note, or pick nodes out on the graph"
      }
      className={open && busy ? "animate-pulse" : undefined}
    >
      <SparkleIcon />
    </Button>
  );
}
