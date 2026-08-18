"use client";

import { PageHeader } from "@/components/frame/PageHeader";
import { NoteList } from "@/components/note/NoteList";
import { PageBody, noteCount } from "@/components/ui/PageBody";
import { useTitle } from "@/hooks/use-title";
import { useVault } from "@/lib/vault/store";

export function HomeView() {
  const { notes } = useVault();
  useTitle(null);

  return (
    <>
      <PageHeader title="Notes" meta={<span>{noteCount(notes.length)}</span>} />
      <PageBody>
        <NoteList
          notes={notes}
          subtitle={(note) =>
            note.tags.length > 0 ? note.tags.join(" · ") : null
          }
        />
      </PageBody>
    </>
  );
}
