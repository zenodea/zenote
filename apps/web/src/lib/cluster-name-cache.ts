"use client";

const KEY = "zenote:cluster-names";

/** Same notes in the same groups → same names; order never matters. */
function fingerprint(clusters: string[][]): string {
  const text = clusters
    .map((slugs) => [...slugs].sort().join(","))
    .sort()
    .join(";");

  let hash = 5381;
  for (let index = 0; index < text.length; index++) {
    hash = ((hash << 5) + hash + text.charCodeAt(index)) | 0;
  }
  return hash.toString(36);
}

type Stored = { fingerprint: string; names: string[] };

export function cachedClusterNames(clusters: string[][]): string[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Stored;
    return stored.fingerprint === fingerprint(clusters) ? stored.names : null;
  } catch {
    return null;
  }
}

export function storeClusterNames(clusters: string[][], names: string[]) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ fingerprint: fingerprint(clusters), names }),
    );
  } catch {}
}
