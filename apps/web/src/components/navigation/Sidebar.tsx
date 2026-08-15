"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { SearchDoc } from "@/lib/search";
import { updateSettings, useSettings } from "@/lib/stores/settings";
import { buildTree } from "@/lib/tree";
import { useVaultDocs } from "@/lib/stores/vault";
import { NoteTree } from "@/components/navigation/NoteTree";
import { SidebarFooter } from "@/components/navigation/SidebarFooter";
import { SidebarHeader } from "@/components/navigation/SidebarHeader";
import { SidebarSearch } from "@/components/navigation/SidebarSearch";
import { useSidebarSearch } from "@/components/navigation/use-sidebar-search";
import { useVaultActions } from "@/components/navigation/use-vault-actions";
import { Scroller } from "@/components/ui/Scroller";

export function Sidebar({ docs }: { docs: SearchDoc[] }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const pathname = usePathname();
  const settings = useSettings();
  const minimised = settings.sidebarCollapsed;

  const vault = useVaultDocs(docs);
  const tree = useMemo(
    () => buildTree(vault.docs, vault.folders),
    [vault.docs, vault.folders],
  );
  const search = useSidebarSearch(vault.docs);
  const { naming, setNaming, submitName, handleMove } = useVaultActions(
    docs,
    vault.docs,
  );

  function toggleFolder(path: string) {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (!next.delete(path)) next.add(path);
      return next;
    });
  }

  function toggleSidebar() {
    const next = !minimised;
    if (next) search.closeSearch();
    updateSettings({ sidebarCollapsed: next });
  }

  const reveal = minimised
    ? "pointer-events-none opacity-0 duration-150"
    : "opacity-100 delay-200 duration-200";

  return (
    <nav
      data-seam="right"
      className={`flex shrink-0 flex-col overflow-hidden border-r border-foreground/15 text-sm transition-[width] duration-300 ease-in-out ${
        minimised ? "w-[60px]" : "w-64"
      }`}
    >
      <SidebarHeader
        minimised={minimised}
        reveal={reveal}
        onToggleSidebar={toggleSidebar}
        search={search}
        naming={naming}
        onNamingChange={setNaming}
      />
      <Scroller
        inert={minimised}
        className={`min-h-0 w-64 flex-1 transition-opacity ${reveal}`}
        contentClassName="p-4"
      >
        {search.open ? (
          <SidebarSearch
            mode={search.mode}
            onModeChange={search.setMode}
            allTags={search.allTags}
            activeTags={search.activeTags}
            onToggleTag={search.toggleTag}
            searching={search.searching}
            results={search.results}
            pathname={pathname}
          />
        ) : (
          <NoteTree
            tree={tree}
            collapsed={collapsed}
            onToggleFolder={toggleFolder}
            pathname={pathname}
            modified={vault.modified}
            naming={naming}
            onSubmitName={submitName}
            onCancelName={() => setNaming(null)}
            onMove={handleMove}
          />
        )}
      </Scroller>
      <SidebarFooter
        minimised={minimised}
        pathname={pathname}
        changeCount={vault.changeCount}
      />
    </nav>
  );
}
