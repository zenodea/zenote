"use client";

import { useSaveStatus } from "@/lib/stores/save-status";

const LABELS = {
  saving: "Saving…",
  saved: "Saved",
  error: "Not saved",
  conflict: "Changed in another tab",
} as const;

export function SaveStatus() {
  const status = useSaveStatus();
  if (status === "idle") return null;

  const failed = status === "error" || status === "conflict";
  const saving = status === "saving";

  return (
    <span
      role="status"
      className={`ml-1 flex shrink-0 items-center gap-1.5 text-xs ${
        failed ? "text-[#ef4444]" : ""
      }`}
    >
      <span
        aria-hidden
        className={`size-2 rotate-45 border transition-colors duration-200 ${
          failed
            ? "border-[#ef4444] bg-[#ef4444]"
            : saving
              ? "border-accent"
              : "border-accent bg-accent"
        }`}
      />
      {LABELS[status]}
    </span>
  );
}
