"use client";

import Link from "next/link";
import type { Backlink } from "@/lib/backlinks";
import { useSettings } from "@/lib/settings";

export function Backlinks({ backlinks }: { backlinks: Backlink[] }) {
  const settings = useSettings();

  if (!settings.showBacklinks || backlinks.length === 0) return null;

  return (
    <footer className="mt-16 border-t border-foreground/15 pt-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
        Linked from
      </h2>
      <ul className="mt-3 space-y-4">
        {backlinks.map((backlink) => (
          <li key={backlink.slug}>
            <Link
              href={`/notes/${backlink.slug}`}
              className="text-sm font-medium hover:opacity-70"
            >
              {backlink.title}
            </Link>
            <ul className="mt-1 space-y-1">
              {backlink.contexts.map((context, i) => (
                <li
                  key={i}
                  className="border-l-2 border-foreground/15 pl-3 text-sm opacity-70"
                >
                  {context.before}
                  <span className="font-medium text-accent">
                    {context.text}
                  </span>
                  {context.after}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </footer>
  );
}
