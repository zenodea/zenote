import "server-only";

const WINDOW_MS = 10 * 60_000;
const LIMIT = 40;

// Per warm instance, which is enough to stop a runaway loop from spending tokens.
const hits = new Map<string, number[]>();

export function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS);

  if (recent.length >= LIMIT) {
    hits.set(key, recent);
    return true;
  }

  recent.push(now);
  hits.set(key, recent);
  return false;
}
