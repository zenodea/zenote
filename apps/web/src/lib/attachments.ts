"use client";

import { createClient } from "./supabase/client";
import { vaultStore } from "./vault/store";

export const ATTACHMENTS_BUCKET = "attachments";

function timestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 14);
}

function attachmentName(file: File): string {
  const original = file.name.trim();
  if (!original || original.toLowerCase().startsWith("image.")) {
    const extension = original.slice(original.lastIndexOf(".")) || ".png";
    return `Pasted image ${timestamp()}${extension}`;
  }
  return original.replace(/[/\\]/g, "-");
}

export async function uploadImage(
  file: File,
): Promise<{ name?: string; error?: string }> {
  const { vault, ownerId } = vaultStore.get();
  if (!vault || !ownerId) {
    return { error: "Images need a signed-in, synced vault." };
  }

  const storage = createClient().storage.from(ATTACHMENTS_BUCKET);
  let name = attachmentName(file);

  let { error } = await storage.upload(`${vault.id}/${name}`, file, {
    contentType: file.type || undefined,
  });
  if (error) {
    const cut = name.lastIndexOf(".");
    name =
      cut === -1
        ? `${name}-${timestamp()}`
        : `${name.slice(0, cut)}-${timestamp()}${name.slice(cut)}`;
    ({ error } = await storage.upload(`${vault.id}/${name}`, file, {
      contentType: file.type || undefined,
    }));
  }

  if (error) return { error: `Could not upload the image: ${error.message}` };
  return { name };
}

const SIGNED_TTL_S = 3600;
const CACHE_SLACK_MS = 300_000;

const urls = new Map<string, { url: string; expires: number }>();

export async function attachmentUrl(name: string): Promise<string | null> {
  const vault = vaultStore.get().vault;
  if (!vault) return null;

  const path = `${vault.id}/${name}`;
  const held = urls.get(path);
  if (held && held.expires > Date.now()) return held.url;

  const { data, error } = await createClient()
    .storage.from(ATTACHMENTS_BUCKET)
    .createSignedUrl(path, SIGNED_TTL_S);
  if (error || !data) return null;

  urls.set(path, {
    url: data.signedUrl,
    expires: Date.now() + SIGNED_TTL_S * 1000 - CACHE_SLACK_MS,
  });
  return data.signedUrl;
}
