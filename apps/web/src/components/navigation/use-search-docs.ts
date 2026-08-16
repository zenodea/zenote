"use client";

import { useEffect, useMemo, useState } from "react";
import {
  readCachedBodies,
  writeCachedBodies,
  type CachedBody,
} from "@/lib/note-body-cache";
import type { SearchDoc, SearchDocMeta } from "@/lib/search";

/** Bodies come from an IndexedDB cache keyed by updated_at; only changed notes refetch. */
export function useSearchDocs(meta: SearchDocMeta[]): SearchDoc[] {
  const [bodies, setBodies] = useState<Map<string, string> | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      let cached = new Map<string, CachedBody>();
      try {
        cached = await readCachedBodies();
      } catch {}

      const stale = meta.filter(
        (doc) => cached.get(doc.slug)?.updated !== doc.updated,
      );
      let fetched: CachedBody[] = [];
      if (stale.length > 0) {
        const response = await fetch("/api/note-bodies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slugs: stale.map((doc) => doc.slug) }),
        });
        if (response.ok) {
          fetched = ((await response.json()) as { notes: CachedBody[] }).notes;
        }
      }

      const map = new Map<string, string>();
      for (const doc of meta) map.set(doc.slug, cached.get(doc.slug)?.body ?? "");
      for (const row of fetched) map.set(row.slug, row.body);
      if (alive) setBodies(map);

      const keep = new Set(meta.map((doc) => doc.slug));
      const drop = [...cached.keys()].filter((slug) => !keep.has(slug));
      try {
        await writeCachedBodies(fetched, drop);
      } catch {}
    })().catch(() => {
      if (alive) setBodies(new Map());
    });
    return () => {
      alive = false;
    };
  }, [meta]);

  return useMemo(
    () => meta.map((doc) => ({ ...doc, body: bodies?.get(doc.slug) ?? "" })),
    [meta, bodies],
  );
}
