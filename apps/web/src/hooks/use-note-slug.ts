"use client";

import { usePathname } from "next/navigation";

const NOTES_PREFIX = "/notes/";

export function useNoteSlug(): string | null {
  const pathname = usePathname();
  if (!pathname.startsWith(NOTES_PREFIX)) return null;
  return decodeURIComponent(pathname.slice(NOTES_PREFIX.length));
}
