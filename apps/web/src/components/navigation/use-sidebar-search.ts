"use client";

import { useMemo, useState } from "react";
import {
  parseQuery,
  prepareDocs,
  searchDocs,
  type SearchDoc,
  type SearchMode,
} from "@/lib/search";
import { useSettings } from "@/lib/stores/settings";

export function useSidebarSearch(docs: SearchDoc[]) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [modeOverride, setMode] = useState<SearchMode | null>(null);
  const settings = useSettings();
  const mode = modeOverride ?? settings.searchMode;

  const prepared = useMemo(() => prepareDocs(docs), [docs]);
  const allTags = useMemo(
    () => [...new Set(docs.flatMap((doc) => doc.tags))].sort(),
    [docs],
  );

  const parsed = useMemo(() => parseQuery(query), [query]);
  const searching = parsed.terms.length > 0 || parsed.tags.length > 0;
  const results = useMemo(
    () => searchDocs(prepared, parsed, mode === "content"),
    [prepared, parsed, mode],
  );

  function closeSearch() {
    setOpen(false);
    setQuery("");
  }

  function toggleTag(tag: string) {
    const token = `#${tag}`;
    const tokens = query.split(/\s+/).filter(Boolean);
    const has = tokens.some((t) => t.toLowerCase() === token);
    const next = has
      ? tokens.filter((t) => t.toLowerCase() !== token)
      : [...tokens, token];
    setQuery(next.join(" "));
  }

  return {
    query,
    setQuery,
    open,
    openSearch: () => setOpen(true),
    closeSearch,
    mode,
    setMode,
    allTags,
    activeTags: parsed.tags,
    searching,
    results,
    toggleTag,
  };
}
