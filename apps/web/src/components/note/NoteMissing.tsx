"use client";

import { revertNote } from "@/lib/stores/vault";
import { Scroller } from "@/components/ui/Scroller";
import { PageHeader } from "@/components/frame/PageHeader";

export function NoteMissing({
  slug,
  deletedLocally,
}: {
  slug: string;
  deletedLocally: boolean;
}) {
  return (
    <>
      <PageHeader title="Not found" />
      <Scroller className="min-h-0 flex-1">
        <div className="mx-auto w-full max-w-3xl px-6 py-12">
          <p className="opacity-60">
            {deletedLocally
              ? `“${slug}” was deleted locally.`
              : `There is no note at “${slug}”.`}
          </p>
          {deletedLocally && (
            <button
              type="button"
              onClick={() => revertNote(slug)}
              className="mt-3 rounded border border-foreground/15 px-2 py-1 text-sm hover:bg-foreground/10"
            >
              Restore note
            </button>
          )}
        </div>
      </Scroller>
    </>
  );
}
