"use client";

import { useMemo } from "react";
import { useTitle } from "@/hooks/use-title";
import { NoteView } from "@/components/note/NoteView";
import { localGraph } from "@/lib/graph/model";
import {
  getBacklinks,
  getBySlug,
  getGraph,
  getResolver,
  useVault,
} from "@/lib/vault/store";

export function NoteRoute({ slug }: { slug: string }) {
  const { notes } = useVault();
  const note = getBySlug().get(slug) ?? null;

  const graph = getGraph();
  const neighbourhood = useMemo(() => localGraph(graph, slug), [graph, slug]);
  const linkTitles = useMemo(() => notes.map((entry) => entry.title), [notes]);

  useTitle(note ? note.title : slug.split("/").pop() ?? slug);

  return (
    <NoteView
      note={note}
      slug={slug}
      resolver={getResolver()}
      linkTitles={linkTitles}
      backlinks={note ? (getBacklinks().get(note.slug) ?? []) : []}
      neighbourhood={neighbourhood}
    />
  );
}
