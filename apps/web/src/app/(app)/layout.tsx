import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AiAssistantProvider, AiPanel } from "@/components/ai/AiAssistant";
import { FocusReset } from "@/components/graph/FocusReset";
import { FindBar } from "@/components/navigation/FindBar";
import { MobileBar } from "@/components/navigation/MobileBar";
import { Footer } from "@/components/frame/Footer";
import { Junctions } from "@/components/frame/Junctions";
import { PageFade } from "@/components/frame/PageFade";
import { RouteLoader } from "@/components/frame/RouteLoader";
import { SwRegister } from "@/components/frame/SwRegister";
import { VaultProvider } from "@/components/frame/VaultProvider";
import { QuickSwitcher } from "@/components/navigation/QuickSwitcher";
import { Sidebar } from "@/components/navigation/Sidebar";
import { getUser } from "@/lib/server/supabase";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const desktop = (await headers()).get("x-zenote-desktop") === "1";
  if (!desktop && !(await getUser())) redirect("/login");

  return (
    <VaultProvider>
      <AiAssistantProvider>
        <Sidebar />
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <PageFade>{children}</PageFade>
          <RouteLoader />
          <FindBar />
          <Footer />
          <MobileBar />
        </main>
        <AiPanel />
      </AiAssistantProvider>
      <Junctions />
      <FocusReset />
      <QuickSwitcher />
      <SwRegister />
    </VaultProvider>
  );
}
