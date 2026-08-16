export const SEARCH_MODES = ["titles", "content"] as const;
export type SearchMode = (typeof SEARCH_MODES)[number];

/** Enough to link to a note and show its name — no body. */
export type NoteRef = { slug: string; title: string };

export type SearchDoc = NoteRef & {
  tags: string[];
  body: string;
};

export type PreparedDoc = SearchDoc & {
  folder: string;
  titleLower: string;
  bodyLower: string;
};

/** Precomputes the lowercase haystacks so typing doesn't re-lower every body. */
export function prepareDocs(docs: SearchDoc[]): PreparedDoc[] {
  return docs.map((doc) => ({
    ...doc,
    folder: doc.slug.split("/").slice(0, -1).join("/"),
    titleLower: doc.title.toLowerCase(),
    bodyLower: doc.body.toLowerCase(),
  }));
}

export type ParsedQuery = { terms: string[]; tags: string[] };

/** Splits a query into free-text terms and #tag filters. */
export function parseQuery(raw: string): ParsedQuery {
  const terms: string[] = [];
  const tags: string[] = [];

  for (const token of raw.trim().toLowerCase().split(/\s+/)) {
    if (!token || token === "#") continue;
    if (token.startsWith("#")) tags.push(token.slice(1));
    else terms.push(token);
  }

  return { terms, tags };
}

export type FuzzyMatch = { score: number; indices: number[] };

/** Greedy subsequence match; consecutive runs and word starts score higher. */
export function fuzzyMatch(
  query: string,
  textLower: string,
): FuzzyMatch | null {
  const indices: number[] = [];
  let score = 0;
  let from = 0;

  for (const char of query) {
    const at = textLower.indexOf(char, from);
    if (at === -1) return null;

    if (at === indices[indices.length - 1] + 1) score += 2;
    else if (at === 0 || /[\s/_-]/.test(textLower[at - 1])) score += 3;
    else score += 1;

    indices.push(at);
    from = at + 1;
  }

  return { score, indices };
}

export type Snippet = { before: string; match: string; after: string };

function makeSnippet(doc: PreparedDoc, term: string): Snippet | null {
  const at = doc.bodyLower.indexOf(term);
  if (at === -1) return null;

  const start = Math.max(0, at - 28);
  const end = Math.min(doc.body.length, at + term.length + 56);
  const flatten = (text: string) => text.replace(/\s+/g, " ");

  return {
    before: (start > 0 ? "…" : "") + flatten(doc.body.slice(start, at)),
    match: flatten(doc.body.slice(at, at + term.length)),
    after:
      flatten(doc.body.slice(at + term.length, end)) +
      (end < doc.body.length ? "…" : ""),
  };
}

export type SearchResult = {
  slug: string;
  title: string;
  folder: string;
  titleIndices: number[] | null;
  snippet: Snippet | null;
  score: number;
};

/** Titles match fuzzily; content by substring, since a subsequence scattered over a document matches anything. */
export function searchDocs(
  docs: PreparedDoc[],
  { terms, tags }: ParsedQuery,
  includeContent: boolean,
): SearchResult[] {
  const results: SearchResult[] = [];
  const fuzzyQuery = terms.join("");

  for (const doc of docs) {
    // Every #tag must prefix-match one of the note's tags.
    if (!tags.every((tag) => doc.tags.some((t) => t.startsWith(tag)))) continue;

    const title = fuzzyQuery ? fuzzyMatch(fuzzyQuery, doc.titleLower) : null;
    const inContent =
      includeContent &&
      terms.length > 0 &&
      terms.every(
        (term) => doc.bodyLower.includes(term) || doc.titleLower.includes(term),
      );

    if (terms.length > 0 && !title && !inContent) continue;

    let snippet: Snippet | null = null;
    if (inContent) {
      for (const term of terms) {
        snippet = makeSnippet(doc, term);
        if (snippet) break;
      }
    }

    results.push({
      slug: doc.slug,
      title: doc.title,
      folder: doc.folder,
      titleIndices: title?.indices ?? null,
      // Title hits rank above content-only hits.
      score: title ? 1000 + title.score : 0,
      snippet,
    });
  }

  return results.sort(
    (a, b) => b.score - a.score || a.title.localeCompare(b.title),
  );
}
