"use client";

import { useEffect, useState } from "react";
import { attachmentUrl } from "@/lib/attachments";

export function AttachmentImage({ name, alt }: { name: string; alt?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    attachmentUrl(name).then((signed) => {
      if (!alive) return;
      if (signed) setUrl(signed);
      else setMissing(true);
    });
    return () => {
      alive = false;
    };
  }, [name]);

  if (missing) {
    return (
      <span className="wikilink-broken" title={`No image found for "${name}"`}>
        {alt || name}
      </span>
    );
  }

  if (!url) {
    return (
      <span
        aria-hidden
        className="my-2 block h-32 w-full max-w-sm animate-pulse rounded bg-foreground/5"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt || name}
      onError={() => setMissing(true)}
      className="max-w-full rounded"
    />
  );
}
