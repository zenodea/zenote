import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AiAssistantProvider, AiPanel } from "@/components/ai/AiAssistant";
import { FindBar } from "@/components/navigation/FindBar";
import { Junctions } from "@/components/frame/Junctions";
import { QuickSwitcher } from "@/components/navigation/QuickSwitcher";
import { Sidebar } from "@/components/navigation/Sidebar";
import { getNoteTitles, getSearchDocs } from "@/lib/server/vault-data";
import { getUser } from "@/lib/server/supabase";

// Signing in crosses this layout boundary, which is what lets the chrome mount without a refresh.
export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!(await getUser())) redirect("/login");

  const [docs, titles] = await Promise.all([getSearchDocs(), getNoteTitles()]);

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
      <Junctions />
      <QuickSwitcher docs={docs} />
    </>
  );
}
