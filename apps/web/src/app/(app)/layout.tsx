import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AiAssistantProvider, AiPanel } from "@/components/ai/AiAssistant";
import { FocusReset } from "@/components/graph/FocusReset";
import { FindBar } from "@/components/navigation/FindBar";
import { MobileBar } from "@/components/navigation/MobileBar";
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
  getSearchDocMeta,
} from "@/lib/server/vault-data";
import { getUser } from "@/lib/server/supabase";

// Signing in crosses this layout boundary, which is what lets the chrome mount without a refresh.
export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!(await getUser())) redirect("/login");

  const [docs, refs, titles, folders, resolver] = await Promise.all([
    getSearchDocMeta(),
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
          <MobileBar />
        </main>
        <AiPanel titles={titles} resolver={Object.fromEntries(resolver)} />
      </AiAssistantProvider>
      <Junctions />
      <FocusReset />
      <QuickSwitcher docs={refs} />
    </>
  );
}
