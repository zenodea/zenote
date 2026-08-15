export const RETURN_PARAM = "next";

// "//evil.com" and "/\evil.com" are protocol-relative, so startsWith("/") alone is an open redirect.
export function safeReturnTo(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}
