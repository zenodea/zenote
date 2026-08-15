import "server-only";
import { cache } from "react";
import { buildBacklinks } from "../backlinks";
import { buildGraph } from "../graph/model";
import type { SearchDoc } from "../search";
import { noteTags } from "../tags";
import { buildResolver } from "../wikilinks";
import { getAllNotes } from "./notes";

export const getResolver = cache(async () => buildResolver(await getAllNotes()));

export const getSearchDocs = cache(async (): Promise<SearchDoc[]> =>
  (await getAllNotes()).map((note) => ({
    slug: note.slug,
    title: note.title,
    tags: noteTags(note),
    body: note.body,
  })),
);

export const getNoteTitles = cache(async () =>
  Object.fromEntries((await getAllNotes()).map((note) => [note.slug, note.title])),
);

export const getGraph = cache(async () =>
  buildGraph(await getAllNotes(), await getResolver()),
);

export const getBacklinks = cache(async () =>
  buildBacklinks(await getAllNotes(), await getResolver()),
);
