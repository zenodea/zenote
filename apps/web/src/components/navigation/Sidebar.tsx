"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { drawingScene } from "@/lib/drawing";
import { closeDrawer, openDrawer, useDrawer } from "@/lib/stores/drawer";
import { updateSettings, useSettings } from "@/lib/stores/settings";
import { buildTree } from "@/lib/tree";
import { useEdgeSwipe } from "@/hooks/use-edge-swipe";
import { useEscape } from "@/hooks/use-hotkey";
import { useLayoutMode } from "@/hooks/use-media-query";
import { NoteTree } from "@/components/navigation/NoteTree";
import { SidebarFooter } from "@/components/navigation/SidebarFooter";
import { SidebarHeader } from "@/components/navigation/SidebarHeader";
import { SidebarSearch } from "@/components/navigation/SidebarSearch";
import { useSidebarSearch } from "@/components/navigation/use-sidebar-search";
import { useVaultActions } from "@/components/navigation/use-vault-actions";
import { Scroller } from "@/components/ui/Scroller";
import { folderPaths, getSearchDocs, useVault } from "@/lib/vault/store";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const pathname = usePathname();
  const settings = useSettings();
  const drawer = useLayoutMode() === "phone";
  const { open: drawerOpen } = useDrawer();
  const minimised = !drawer && settings.sidebarCollapsed;

  const vault = useVault();
  const docs = getSearchDocs();
  const folders = useMemo(() => folderPaths(vault.folders), [vault.folders]);
  const tree = useMemo(
    () =>
      buildTree(
        docs.map((doc) => ({
          slug: doc.slug,
          title: doc.title,
          drawing: drawingScene(doc.body) !== null,
        })),
        folders,
      ),
    [docs, folders],
  );
  const search = useSidebarSearch(docs);
  const {
    naming,
    setNaming,
    submitName,
    handleMove,
    handleMoveFolder,
    handleDeleteFolder,
  } = useVaultActions();

  function toggleFolder(path: string) {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (!next.delete(path)) next.add(path);
      return next;
    });
  }

  function toggleSidebar() {
    if (drawer) {
      closeDrawer();
      return;
    }
    const next = !minimised;
    if (next) search.closeSearch();
    updateSettings({ sidebarCollapsed: next });
  }

  useEffect(() => {
    delete document.documentElement.dataset.sidebar;
  }, []);

  useEffect(() => {
    closeDrawer();
  }, [pathname]);

  useEscape(closeDrawer, drawer && drawerOpen);
  useEdgeSwipe(drawer, drawerOpen, openDrawer, closeDrawer);

  const reveal = minimised
    ? "sidebar-reveal pointer-events-none opacity-0 duration-150"
    : "sidebar-reveal opacity-100 delay-200 duration-200";

  return (
    <>
      {drawer && (
        <div
          aria-hidden
          onClick={closeDrawer}
          className={`fixed inset-0 z-30 bg-black/50 transition-opacity duration-300 ${
            drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />
      )}
      <nav
        aria-label="Vault"
        data-seam={drawer ? undefined : "right"}
        inert={drawer && !drawerOpen}
        className={
          drawer
            ? `fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85%] flex-col overflow-hidden border-r border-foreground/15 bg-background text-sm transition-transform duration-300 ease-in-out ${
                drawerOpen ? "translate-x-0" : "-translate-x-full"
              }`
            : `sidebar flex shrink-0 flex-col overflow-hidden border-r border-foreground/15 text-sm transition-[width] duration-300 ease-in-out ${
                minimised ? "w-[60px]" : "w-64"
              }`
        }
      >
        <SidebarHeader
          drawer={drawer}
          minimised={minimised}
          reveal={reveal}
          onToggleSidebar={toggleSidebar}
          search={search}
          naming={naming}
          onNamingChange={setNaming}
        />
        <Scroller
          inert={minimised}
          className={`min-h-0 flex-1 transition-opacity ${
            drawer ? "w-full" : "w-64"
          } ${reveal}`}
          contentClassName="flex-1 p-4"
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
              folders={folders}
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
        <SidebarFooter
          minimised={minimised}
          reveal={reveal}
          pathname={pathname}
          drawer={drawer}
        />
      </nav>
    </>
  );
}
