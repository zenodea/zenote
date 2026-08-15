import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AiAssistantProvider, AiPanel } from "@/components/AiAssistant";
import { FindBar } from "@/components/navigation/FindBar";
import { Junctions } from "@/components/frame/Junctions";
import { QuickSwitcher } from "@/components/navigation/QuickSwitcher";
import { Sidebar } from "@/components/navigation/Sidebar";
import { getAllNotes } from "@/lib/notes";
import type { SearchDoc } from "@/lib/search";
import { getUser } from "@/lib/supabase/server";
import { noteTags } from "@/lib/tags";

// Everything behind the login lives in this group so that signing in *crosses a
// layout boundary*. The root layout is shared with /login, and a soft
// navigation reuses shared layouts — which is why arriving here used to need a
// router.refresh() and the whole-page reload that came with it.
export default async function AppLayout({ children }: { children: ReactNode }) {
  // Middleware already gates this, but that makes the matcher the only thing
  // standing between a logged-out request and getAllNotes().
  if (!(await getUser())) redirect("/login");

  const notes = await getAllNotes();
  const titles = Object.fromEntries(
    notes.map((note) => [note.slug, note.title]),
  );
  const docs: SearchDoc[] = notes.map((note) => ({
    slug: note.slug,
    title: note.title,
    tags: noteTags(note),
    body: note.body,
  }));

  return (
    <>
      <AiAssistantProvider>
        <Sidebar docs={docs} />
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          {children}
          <FindBar />
        </main>
        <AiPanel titles={titles} />
      </AiAssistantProvider>
      {/* Zed-style markers wherever data-seam separators intersect. */}
      <Junctions />
      <QuickSwitcher docs={docs} />
    </>
  );
}
