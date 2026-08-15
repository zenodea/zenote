"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { SearchDoc } from "@/lib/search";
import { filename, joinSlug, sanitizeName } from "@/lib/slug";
import { createFolder, createNote, moveNote } from "@/lib/stores/vault";

export type Naming = "note" | "folder" | null;

export function useVaultActions(baseDocs: SearchDoc[], docs: SearchDoc[]) {
  const [naming, setNaming] = useState<Naming>(null);
  const pathname = usePathname();
  const router = useRouter();

  function submitName(raw: string) {
    const name = sanitizeName(raw);
    setNaming(null);
    if (!name) return;
    if (naming === "folder") {
      createFolder(name);
      return;
    }
    if (!docs.some((doc) => doc.slug === name)) createNote(name);
    router.push(`/notes/${name}`);
  }

  function handleMove(slug: string, folder: string) {
    const doc = docs.find((entry) => entry.slug === slug);
    if (!doc) return;
    const next = joinSlug(folder, filename(slug));
    if (next === slug) return;

    moveNote(slug, folder, {
      body: doc.body,
      isBaseNote: baseDocs.some((entry) => entry.slug === slug),
    });
    if (pathname === `/notes/${slug}`) router.push(`/notes/${next}`);
  }

  return { naming, setNaming, submitName, handleMove };
}
