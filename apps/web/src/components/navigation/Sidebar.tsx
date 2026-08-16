"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { SearchDoc } from "@/lib/search";
import { updateSettings, useSettings } from "@/lib/stores/settings";
import { buildTree } from "@/lib/tree";
import { NoteTree } from "@/components/navigation/NoteTree";
import { SidebarFooter } from "@/components/navigation/SidebarFooter";
import { SidebarHeader } from "@/components/navigation/SidebarHeader";
import { SidebarSearch } from "@/components/navigation/SidebarSearch";
import { useSidebarSearch } from "@/components/navigation/use-sidebar-search";
import { useVaultActions } from "@/components/navigation/use-vault-actions";
import { Scroller } from "@/components/ui/Scroller";

export function Sidebar({
  docs,
  folders,
}: {
  docs: SearchDoc[];
  folders: string[];
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const pathname = usePathname();
  const settings = useSettings();
  const minimised = settings.sidebarCollapsed;

  const tree = useMemo(() => buildTree(docs, folders), [docs, folders]);
  const search = useSidebarSearch(docs);
  const {
    naming,
    setNaming,
    submitName,
    handleMove,
    handleMoveFolder,
    handleDeleteFolder,
  } = useVaultActions(docs);

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

  // The boot script sizes the rail before paint; left up, the attribute would outrank the classes below.
  useEffect(() => {
    delete document.documentElement.dataset.sidebar;
  }, []);

  const reveal = minimised
    ? "sidebar-reveal pointer-events-none opacity-0 duration-150"
    : "sidebar-reveal opacity-100 delay-200 duration-200";

  return (
    <nav
      data-seam="right"
      className={`sidebar flex shrink-0 flex-col overflow-hidden border-r border-foreground/15 text-sm transition-[width] duration-300 ease-in-out ${
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
            naming={naming}
            onNamingChange={setNaming}
            onSubmitName={submitName}
            onCancelName={() => setNaming(null)}
            onMove={handleMove}
            onMoveFolder={handleMoveFolder}
            onDeleteFolder={handleDeleteFolder}
          />
        )}
      </Scroller>
      <SidebarFooter minimised={minimised} pathname={pathname} />
    </nav>
  );
}
