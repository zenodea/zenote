"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { navigate } from "@/lib/navigation";
import type { NoteRef } from "@/lib/search";
import { filename, joinSlug, sanitizeName } from "@/lib/slug";
import {
  createFolder,
  createNote,
  deleteFolder,
  moveFolder,
  moveNote,
  renameFolder,
} from "@/lib/vault/mutations";

export type Naming = {
  kind: "note" | "folder";
  into: string;
  rename?: string;
} | null;

export function useVaultActions(docs: NoteRef[]) {
  const [naming, setNaming] = useState<Naming>(null);
  const pathname = usePathname();

  async function submitName(raw: string) {
    const name = sanitizeName(raw);
    const target = naming;
    setNaming(null);
    if (!name || !target) return;

    if (target.rename !== undefined) {
      const { error } = await renameFolder(target.rename, name);
      if (error) alert(error);
      return;
    }

    const path = joinSlug(target.into, name);

    if (target.kind === "folder") {
      const { error } = await createFolder(path);
      if (error) alert(error);
      return;
    }

    if (!docs.some((doc) => doc.slug === path)) {
      const { error } = await createNote(path);
      if (error) {
        alert(error);
        return;
      }
    }
    navigate(`/notes/${path}`);
  }

  async function handleMoveFolder(path: string, into: string) {
    const { error } = await moveFolder(path, into);
    if (error) alert(error);
  }

  async function handleDeleteFolder(path: string) {
    if (!confirm(`Delete “${path}”? Everything in it moves up a level.`))
      return;
    const { error } = await deleteFolder(path);
    if (error) alert(error);
  }

  async function handleMove(slug: string, folder: string) {
    const next = joinSlug(folder, filename(slug));
    if (next === slug) return;

    const { error } = await moveNote(slug, folder);
    if (error) {
      alert(error);
      return;
    }
    if (pathname === `/notes/${slug}`) navigate(`/notes/${next}`);
  }

  return {
    naming,
    setNaming,
    submitName,
    handleMove,
    handleMoveFolder,
    handleDeleteFolder,
  };
}
