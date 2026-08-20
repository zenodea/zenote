"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { drawingBody, EMPTY_SCENE } from "@/lib/drawing";
import { navigate } from "@/lib/navigation";
import { filename, joinSlug, sanitizeName } from "@/lib/slug";
import { markFreshNote } from "@/lib/stores/fresh-note";
import {
  createFolder,
  createUnnamedNote,
  deleteFolder,
  moveFolder,
  moveNote,
  renameFolder,
} from "@/lib/vault/mutations";

export type Naming = {
  kind: "folder";
  into: string;
  rename?: string;
} | null;

export async function startUnnamedNote(folder = "", body = ""): Promise<void> {
  const { error, slug } = await createUnnamedNote(folder, body);
  if (error || !slug) {
    if (error) alert(error);
    return;
  }
  markFreshNote(slug);
  navigate(`/notes/${slug}`);
}

export const startUnnamedDrawing = (folder = "") =>
  startUnnamedNote(folder, drawingBody(EMPTY_SCENE));

export function useVaultActions() {
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

    const { error } = await createFolder(joinSlug(target.into, name));
    if (error) alert(error);
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
