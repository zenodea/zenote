"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { revalidateVault, saveNote } from "@/app/actions/notes";
import { setSaveStatus } from "@/lib/stores/save-status";

const DEBOUNCE_MS = 1000;

export function useAutosave(slug: string, updated: string) {
  const router = useRouter();
  const base = useRef(updated);
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const flush = useCallback(async () => {
    stop();
    const body = pending.current;
    if (body === null) return;
    pending.current = null;

    setSaveStatus("saving");
    try {
      const result = await saveNote(slug, body, base.current);
      if (result.status === "conflict") {
        setSaveStatus("conflict");
        return;
      }
      base.current = result.updated;
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, [slug, stop]);

  const change = useCallback(
    (body: string) => {
      pending.current = body;
      dirty.current = true;
      stop();
      timer.current = setTimeout(flush, DEBOUNCE_MS);
    },
    [flush, stop],
  );

  const discard = useCallback(() => {
    stop();
    pending.current = null;
  }, [stop]);

  /**
   * Lands whatever is outstanding and reports whether the note has moved since
   * the last time it settled — that is, whether anything reading the note from
   * the server is now out of date.
   */
  const settle = useCallback(async () => {
    await flush();
    const changed = dirty.current;
    dirty.current = false;
    return changed;
  }, [flush]);

  /**
   * Lands the note and lets the rest of the vault catch up with it. The
   * revalidation is what reaches routes other than this one — the graph a new
   * wikilink belongs in is not refreshed by refreshing the note it was typed in.
   */
  const publish = useCallback(async () => {
    if (!(await settle())) return;
    await revalidateVault();
    router.refresh();
  }, [settle, router]);

  useEffect(() => {
    setSaveStatus("idle");

    function warn(event: BeforeUnloadEvent) {
      if (pending.current !== null) event.preventDefault();
    }

    window.addEventListener("beforeunload", warn);

    return () => {
      window.removeEventListener("beforeunload", warn);
      // Server-rendered sidebar/search/backlinks catch up when the note is left,
      // not on every pause in typing.
      void publish();
    };
  }, [publish]);

  return { change, flush, publish, discard };
}
