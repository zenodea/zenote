"use client";

import { usePathname } from "next/navigation";
import { NotFoundView } from "@/components/frame/NotFoundView";
import { GraphRoute } from "@/components/graph/GraphRoute";
import { HomeView } from "@/components/note/HomeView";
import { NoteRoute } from "@/components/note/NoteRoute";
import { TagView } from "@/components/note/TagView";
import { SettingsView } from "@/components/settings/SettingsView";
import { VaultSetup } from "@/components/frame/VaultSetup";
import { decodeSlug } from "@/lib/navigation";
import { useVault } from "@/lib/vault/store";

export function AppShell() {
  const pathname = usePathname() ?? "/";
  const { status } = useVault();

  if (status === "loading") return null;
  if (status === "setup") return <VaultSetup />;

  if (pathname === "/") return <HomeView />;
  if (pathname.startsWith("/notes/")) {
    const slug = decodeSlug(pathname.slice("/notes/".length));
    return <NoteRoute key={slug} slug={slug} />;
  }
  if (pathname === "/graph") return <GraphRoute />;
  if (pathname.startsWith("/tags/")) {
    return <TagView tag={decodeSlug(pathname.slice("/tags/".length))} />;
  }
  if (pathname === "/settings") return <SettingsView />;
  return <NotFoundView />;
}
