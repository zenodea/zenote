export function filename(slug: string): string {
  return slug.slice(slug.lastIndexOf("/") + 1);
}

export function folder(slug: string): string {
  const cut = slug.lastIndexOf("/");
  return cut === -1 ? "" : slug.slice(0, cut);
}

export function joinSlug(folder: string, name: string): string {
  return folder ? `${folder}/${name}` : name;
}

export function sanitizeName(raw: string): string | null {
  const name = raw
    .trim()
    .replace(/\.md$/i, "")
    .replace(/^\/+|\/+$/g, "");

  if (!name || name.split("/").some((part) => !part.trim() || part === "..")) {
    return null;
  }
  return name;
}
