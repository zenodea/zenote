"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createFolder, createNote, moveNote } from "@/app/actions/notes";
import type { NoteRef } from "@/lib/search";
import { filename, joinSlug, sanitizeName } from "@/lib/slug";

export type Naming = "note" | "folder" | null;

export function useVaultActions(docs: NoteRef[]) {
  const [naming, setNaming] = useState<Naming>(null);
  const pathname = usePathname();
  const router = useRouter();

  async function submitName(raw: string) {
    const name = sanitizeName(raw);
    setNaming(null);
    if (!name) return;

    if (naming === "folder") {
      const { error } = await createFolder(name);
      if (error) alert(error);
      return;
    }

    if (!docs.some((doc) => doc.slug === name)) {
      const { error } = await createNote(name);
      if (error) {
        alert(error);
        return;
      }
    }
    router.push(`/notes/${name}`);
  }

  async function handleMove(slug: string, folder: string) {
    const next = joinSlug(folder, filename(slug));
    if (next === slug) return;

    const { error } = await moveNote(slug, folder);
    if (error) {
      alert(error);
      return;
    }
    if (pathname === `/notes/${slug}`) router.push(`/notes/${next}`);
  }

  return { naming, setNaming, submitName, handleMove };
}
