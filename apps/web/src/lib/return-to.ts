// Middleware writes the blocked destination here; Frame reads it back after a
// successful sign-in so deep links survive the trip through /login.
export const RETURN_PARAM = "next";

/**
 * Only same-origin absolute paths survive. `//evil.com` and `/\evil.com` are
 * both browser-legal protocol-relative URLs, so a bare startsWith("/") is not
 * enough to keep this from becoming an open redirect.
 */
export function safeReturnTo(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}
