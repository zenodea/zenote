"use client";

import { useAiAssistant } from "@/components/ai/AiAssistantContext";
import { AiDiamond } from "@/components/ai/AiDiamond";
import { Button } from "@/components/ui/Button";
import { useNoteSlug } from "@/hooks/use-note-slug";
import { useGraphFocus } from "@/lib/stores/graph-focus";
import { useVault } from "@/lib/vault/store";

export function AiButton() {
  const { open, setOpen, busy } = useAiAssistant();
  const { ownerId } = useVault();
  const slug = useNoteSlug();
  const selection = useGraphFocus();
  const subject = slug !== null || selection.length > 0;

  if (!ownerId) return null;

  return (
    <Button
      onClick={() => setOpen(!open)}
      active={open}
      aria-pressed={open}
      aria-label={open ? "Close AI assistant" : "Ask AI"}
      title={
        subject
          ? "Ask AI about what you are looking at"
          : "Ask AI about your vault"
      }
    >
      <AiDiamond busy={open && busy} />
    </Button>
  );
}
