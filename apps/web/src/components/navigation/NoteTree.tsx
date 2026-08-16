"use client";

import { useState } from "react";
import Link from "next/link";
import type { TreeNode } from "@/lib/tree";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dropdown } from "@/components/ui/Dropdown";
import {
  ChevronIcon,
  EllipsisIcon,
  FilePlusIcon,
  FolderPlusIcon,
} from "@/components/ui/Icons";
import type { Naming } from "@/components/navigation/use-vault-actions";

export function NoteTree({
  tree,
  collapsed,
  onToggleFolder,
  pathname,
  naming,
  onNamingChange,
  onSubmitName,
  onCancelName,
  onMove,
  onMoveFolder,
  onDeleteFolder,
}: {
  tree: TreeNode[];
  collapsed: Set<string>;
  onToggleFolder: (path: string) => void;
  pathname: string;
  naming: Naming;
  onNamingChange: (naming: Naming) => void;
  onSubmitName: (name: string) => void;
  onCancelName: () => void;
  onMove: (slug: string, folder: string) => void;
  onMoveFolder: (path: string, into: string) => void;
  onDeleteFolder: (path: string) => void;
}) {
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  function drop(event: React.DragEvent, folder: string) {
    setDropTarget(null);

    const slug = event.dataTransfer.getData("application/x-note");
    if (slug) return onMove(slug, folder);

    const path = event.dataTransfer.getData("application/x-folder");
    if (path) onMoveFolder(path, folder);
  }

  return (
    <div
      className={`min-h-full rounded ${
        dropTarget === "" ? "bg-foreground/5" : ""
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        setDropTarget("");
      }}
      onDragLeave={() => setDropTarget(null)}
      onDrop={(event) => {
        event.preventDefault();
        drop(event, "");
      }}
    >
      {naming && naming.into === "" && naming.rename === undefined && (
        <NamingRow
          kind={naming.kind}
          onSubmit={onSubmitName}
          onCancel={onCancelName}
        />
      )}
      <NodeList
        nodes={tree}
        depth={0}
        collapsed={collapsed}
        onToggle={onToggleFolder}
        pathname={pathname}
        dropTarget={dropTarget}
        onDropTarget={setDropTarget}
        onDrop={drop}
        naming={naming}
        onNamingChange={onNamingChange}
        onSubmitName={onSubmitName}
        onCancelName={onCancelName}
        onDeleteFolder={onDeleteFolder}
      />
    </div>
  );
}

function FolderAction({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded px-2 py-1 text-left hover:bg-foreground/10"
    >
      {children}
    </button>
  );
}

function NamingRow({
  kind,
  onSubmit,
  onCancel,
}: {
  kind: "note" | "folder";
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");

  return (
    <div className="mb-2 flex items-center gap-1.5">
      <span className="shrink-0 opacity-60">
        {kind === "note" ? <FilePlusIcon /> : <FolderPlusIcon />}
      </span>
      <Input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onSubmit(name);
          if (event.key === "Escape") onCancel();
        }}
        onBlur={onCancel}
        placeholder={kind === "note" ? "Note name…" : "Folder name…"}
        aria-label={kind === "note" ? "New note name" : "New folder name"}
        className="min-w-0 flex-1"
      />
    </div>
  );
}

type NodeListProps = {
  nodes: TreeNode[];
  depth: number;
  collapsed: Set<string>;
  onToggle: (path: string) => void;
  pathname: string;
  dropTarget: string | null;
  onDropTarget: (path: string | null) => void;
  onDrop: (event: React.DragEvent, folder: string) => void;
  naming: Naming;
  onNamingChange: (naming: Naming) => void;
  onSubmitName: (name: string) => void;
  onCancelName: () => void;
  onDeleteFolder: (path: string) => void;
};

function NodeList({
  nodes,
  depth,
  collapsed,
  onToggle,
  pathname,
  dropTarget,
  onDropTarget,
  onDrop,
  naming,
  onNamingChange,
  onSubmitName,
  onCancelName,
  onDeleteFolder,
}: NodeListProps) {
  const nested = {
    depth: depth + 1,
    collapsed,
    onToggle,
    pathname,
    dropTarget,
    onDropTarget,
    onDrop,
    naming,
    onNamingChange,
    onSubmitName,
    onCancelName,
    onDeleteFolder,
  };

  return (
    <ul className="relative space-y-0.5">
      {/* One hairline per level, on the centre of the chevron that opened it.
          Inset by a row's own padding, so it runs between the first and last
          child's text rather than edge to edge. */}
      {depth > 0 && (
        <span
          aria-hidden
          style={{ left: `${(depth - 1) * 0.75 + 0.875}rem` }}
          className="pointer-events-none absolute bottom-1.5 top-1.5 w-px bg-foreground/10"
        />
      )}
      {nodes.map((node) => {
        const folderIndent = { paddingLeft: `${depth * 0.75 + 0.5}rem` };
        const fileIndent = { paddingLeft: `${depth * 0.75 + 1.5}rem` };

        if (node.kind === "folder") {
          const isCollapsed = collapsed.has(node.path);

          return (
            <li key={node.path}>
              <div className="group/row flex items-center">
                <Button
                  variant="row"
                  onClick={() => onToggle(node.path)}
                  style={folderIndent}
                  aria-expanded={!isCollapsed}
                  draggable
                  onDragStart={(event) => {
                    event.stopPropagation();
                    event.dataTransfer.setData(
                      "application/x-folder",
                      node.path,
                    );
                  }}
                  className={`min-w-0 flex-1 ${
                    dropTarget === node.path ? "bg-foreground/10" : ""
                  }`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onDropTarget(node.path);
                  }}
                  onDragLeave={(event) => {
                    event.stopPropagation();
                    onDropTarget(null);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onDrop(event, node.path);
                  }}
                >
                  <ChevronIcon
                    className={`w-3 shrink-0 transition-transform ${
                      isCollapsed ? "" : "rotate-90"
                    }`}
                  />
                  {node.name}
                </Button>

                <Dropdown
                  label={<EllipsisIcon />}
                  ariaLabel={`Actions for ${node.name}`}
                  triggerClassName="shrink-0 rounded px-1 opacity-0 hover:bg-foreground/10 focus-visible:opacity-100 group-hover/row:opacity-100"
                >
                  <FolderAction
                    onClick={() =>
                      onNamingChange({ kind: "note", into: node.path })
                    }
                  >
                    New note
                  </FolderAction>
                  <FolderAction
                    onClick={() =>
                      onNamingChange({ kind: "folder", into: node.path })
                    }
                  >
                    New folder
                  </FolderAction>
                  <FolderAction
                    onClick={() =>
                      onNamingChange({
                        kind: "folder",
                        into: node.path,
                        rename: node.path,
                      })
                    }
                  >
                    Rename…
                  </FolderAction>
                  <FolderAction onClick={() => onDeleteFolder(node.path)}>
                    Delete
                  </FolderAction>
                </Dropdown>
              </div>

              {naming && naming.into === node.path && !isCollapsed && (
                <div style={{ paddingLeft: `${(depth + 1) * 0.75 + 0.5}rem` }}>
                  <NamingRow
                    kind={naming.rename === undefined ? naming.kind : "folder"}
                    onSubmit={onSubmitName}
                    onCancel={onCancelName}
                  />
                </div>
              )}

              {!isCollapsed && (
                <div className="tree-branch">
                  <div>
                    <NodeList nodes={node.children} {...nested} />
                  </div>
                </div>
              )}
            </li>
          );
        }

        const href = `/notes/${node.slug}`;
        const isActive = pathname === href;

        return (
          <li key={node.slug}>
            <Link
              href={href}
              style={fileIndent}
              aria-current={isActive ? "page" : undefined}
              draggable
              onDragStart={(event) => {
                event.stopPropagation();
                event.dataTransfer.setData("application/x-note", node.slug);
              }}
              className={`block truncate rounded py-1.5 pr-2 hover:bg-foreground/10 ${
                isActive ? "bg-foreground/10" : ""
              }`}
            >
              {node.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
