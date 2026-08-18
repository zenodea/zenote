"use client";

import { useCallback, useEffect, useRef } from "react";
import { setSaveStatus } from "@/lib/stores/save-status";
import { markEditingDirty } from "@/lib/vault/editing";
import { saveBody } from "@/lib/vault/mutations";
import { syncNow } from "@/lib/vault/sync";

const DEBOUNCE_MS = 300;

export function useAutosave(slug: string) {
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      await saveBody(slug, body);
      setSaveStatus("saved");
    } catch {
      if (pending.current === null) pending.current = body;
      setSaveStatus("error");
    }
  }, [slug, stop]);

  const change = useCallback(
    (body: string) => {
      pending.current = body;
      markEditingDirty();
      stop();
      timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);
    },
    [flush, stop],
  );

  const discard = useCallback(() => {
    stop();
    pending.current = null;
  }, [stop]);

  useEffect(() => {
    setSaveStatus("idle");

    function warn(event: BeforeUnloadEvent) {
      if (pending.current !== null) event.preventDefault();
    }

    function onHide() {
      void flush().then(() => {
        if (document.hidden) void syncNow();
      });
    }

    window.addEventListener("beforeunload", warn);
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);

    return () => {
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
      void flush();
    };
  }, [flush]);

  return { change, flush, publish: flush, discard };
}
