import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AiAssistantProvider, AiPanel } from "@/components/ai/AiAssistant";
import { FindBar } from "@/components/navigation/FindBar";
import { Footer } from "@/components/frame/Footer";
import { Junctions } from "@/components/frame/Junctions";
import { PageFade } from "@/components/frame/PageFade";
import { RouteLoader } from "@/components/frame/RouteLoader";
import { QuickSwitcher } from "@/components/navigation/QuickSwitcher";
import { Sidebar } from "@/components/navigation/Sidebar";
import { getFolders } from "@/lib/server/folders";
import {
  getNoteRefs,
  getNoteTitles,
  getResolver,
  getSearchDocs,
} from "@/lib/server/vault-data";
import { getUser } from "@/lib/server/supabase";

// Signing in crosses this layout boundary, which is what lets the chrome mount without a refresh.
export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!(await getUser())) redirect("/login");

  const [docs, refs, titles, folders, resolver] = await Promise.all([
    getSearchDocs(),
    getNoteRefs(),
    getNoteTitles(),
    getFolders(),
    getResolver(),
  ]);

  return (
    <>
      <AiAssistantProvider>
        <Sidebar docs={docs} folders={folders} />
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <PageFade>{children}</PageFade>
          {/* Outside PageFade on purpose: the loader spans the swap the fade is hiding. */}
          <RouteLoader />
          <FindBar />
          <Footer />
        </main>
        <AiPanel titles={titles} resolver={Object.fromEntries(resolver)} />
      </AiAssistantProvider>
      <Junctions />
      <QuickSwitcher docs={refs} />
    </>
  );
}
