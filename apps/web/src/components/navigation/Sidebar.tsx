"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { SearchDocMeta } from "@/lib/search";
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
import { useSearchDocs } from "@/components/navigation/use-search-docs";
import { useSidebarSearch } from "@/components/navigation/use-sidebar-search";
import { useVaultActions } from "@/components/navigation/use-vault-actions";
import { Scroller } from "@/components/ui/Scroller";

export function Sidebar({
  docs,
  folders,
}: {
  docs: SearchDocMeta[];
  folders: string[];
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const pathname = usePathname();
  const settings = useSettings();
  const drawer = useLayoutMode() === "phone";
  const { open: drawerOpen, newNote } = useDrawer();
  // The collapsed rail is a desktop shape; a drawer is either in or out.
  const minimised = !drawer && settings.sidebarCollapsed;

  const hydrated = useSearchDocs(docs);
  const tree = useMemo(() => buildTree(docs, folders), [docs, folders]);
  const search = useSidebarSearch(hydrated);
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
    if (drawer) {
      closeDrawer();
      return;
    }
    const next = !minimised;
    if (next) search.closeSearch();
    updateSettings({ sidebarCollapsed: next });
  }

  // The boot script sizes the rail before paint; left up, the attribute would outrank the classes below.
  useEffect(() => {
    delete document.documentElement.dataset.sidebar;
  }, []);

  // Opening a note is the drawer's exit; it must not stay over what it navigated to.
  useEffect(() => {
    closeDrawer();
  }, [pathname]);

  // The bottom bar's new-note button lands here, since the field lives in the tree.
  const seenNewNote = useRef(newNote);
  useEffect(() => {
    if (newNote === seenNewNote.current) return;
    seenNewNote.current = newNote;
    setNaming({ kind: "note", into: "" });
  }, [newNote, setNaming]);

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
          className={`fixed inset-0 z-30 bg-foreground/25 transition-opacity duration-300 ${
            drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />
      )}
      <nav
        aria-label="Vault"
        // No seam on a phone: the drawer floats over the page rather than framing it.
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
        <SidebarFooter minimised={minimised} pathname={pathname} />
      </nav>
    </>
  );
}
