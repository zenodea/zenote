import type { UIMessage } from "ai";

/** What the assistant is looking at: the note being read, or a selection made on the graph. */
export type ChatSubject =
  { kind: "note"; slug: string } | { kind: "selection"; slugs: string[] };

/** Carried on replayed messages; a turn that never finished is shown but not resent. */
export type ChatMessageMeta = { status?: "complete" | "aborted" | "failed" };

export type VaultUIMessage = UIMessage<ChatMessageMeta>;

export function isChatSubject(value: unknown): value is ChatSubject {
  if (typeof value !== "object" || value === null) return false;
  const subject = value as Record<string, unknown>;
  if (subject.kind === "note") return typeof subject.slug === "string";
  return (
    subject.kind === "selection" &&
    Array.isArray(subject.slugs) &&
    subject.slugs.every((slug) => typeof slug === "string")
  );
}

/** Identity of a subject, for spotting when the conversation is about something else. */
export function subjectKey(subject: ChatSubject | null): string {
  if (!subject) return "";
  return subject.kind === "note"
    ? `note:${subject.slug}`
    : `selection:${[...subject.slugs].sort().join(",")}`;
}

export function messageText(message: VaultUIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}
