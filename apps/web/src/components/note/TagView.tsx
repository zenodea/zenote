"use client";

import { useMemo } from "react";
import { NotFoundView } from "@/components/frame/NotFoundView";
import { PageHeader } from "@/components/frame/PageHeader";
import { NoteList } from "@/components/note/NoteList";
import { PageBody, noteCount } from "@/components/ui/PageBody";
import { useTitle } from "@/hooks/use-title";
import { buildTagIndex, noteTags } from "@/lib/tags";
import { useVault } from "@/lib/vault/store";

export function TagView({ tag }: { tag: string }) {
  const { notes } = useVault();
  const name = tag.toLowerCase();
  const tagged = useMemo(
    () => buildTagIndex(notes).get(name) ?? null,
    [notes, name],
  );
  useTitle(`#${name}`);

  if (!tagged) return <NotFoundView />;

  return (
    <>
      <PageHeader
        title={`#${name}`}
        meta={<span>{noteCount(tagged.length)}</span>}
      />
      <PageBody>
        <NoteList
          notes={tagged}
          subtitle={(note) =>
            noteTags(note)
              .filter((other) => other !== name)
              .map((other) => `#${other}`)
              .join(" ")
          }
        />
      </PageBody>
    </>
  );
}
