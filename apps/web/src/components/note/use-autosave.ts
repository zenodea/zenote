"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { revalidateVault, saveNote } from "@/app/actions/notes";
import { setSaveStatus } from "@/lib/stores/save-status";

const DEBOUNCE_MS = 1000;
const RETRY_MS = 4000;
/** Away for longer than this and the note on screen may no longer be the note. */
const STALE_MS = 30000;

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

  const flushRef = useRef<() => Promise<void>>(async () => {});

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
      // A phone drops its connection mid-sentence: hold the buffer and try again.
      if (pending.current === null) pending.current = body;
      setSaveStatus("error");
      stop();
      timer.current = setTimeout(() => void flushRef.current(), RETRY_MS);
    }
  }, [slug, stop]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

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

  /** Lands the note, then revalidates: refreshing this route never reaches the graph a wikilink belongs in. */
  const publish = useCallback(async () => {
    await flush();
    if (!dirty.current) return;
    dirty.current = false;

    await revalidateVault();
    router.refresh();
  }, [flush, router]);

  useEffect(() => {
    setSaveStatus("idle");
    let hiddenAt = 0;

    function warn(event: BeforeUnloadEvent) {
      if (pending.current !== null) event.preventDefault();
    }

    // A phone suspends and kills backgrounded tabs without warning, and
    // beforeunload never fires for it: the debounce has to land here instead.
    function onHide() {
      hiddenAt = performance.now();
      void flush();
    }

    function onVisibility() {
      if (document.hidden) {
        onHide();
        return;
      }
      // Back after a while: the note may have moved on, and nothing said so.
      if (pending.current !== null) return;
      if (hiddenAt && performance.now() - hiddenAt > STALE_MS) router.refresh();
      hiddenAt = 0;
    }

    window.addEventListener("beforeunload", warn);
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
      // Sidebar, search and backlinks catch up when the note is left, not on every pause in typing.
      void publish();
    };
  }, [publish, flush, router]);

  return { change, flush, publish, discard };
}
