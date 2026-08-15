"use client";

import { useAiAssistant } from "@/components/ai/AiAssistantContext";
import { Button } from "@/components/ui/Button";
import { SparkleIcon } from "@/components/ui/Icons";
import { useNoteSlug } from "@/hooks/use-note-slug";

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
