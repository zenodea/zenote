/** What the assistant is looking at: the note being read, or a selection made on the graph. */
export type ChatSubject =
  { kind: "note"; slug: string } | { kind: "selection"; slugs: string[] };

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatRequest = { subject: ChatSubject; messages: ChatMessage[] };

export function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Record<string, unknown>;
  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string"
  );
}

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

export async function streamPlainText(
  body: ReadableStream<Uint8Array>,
  onChunk: (text: string) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}
