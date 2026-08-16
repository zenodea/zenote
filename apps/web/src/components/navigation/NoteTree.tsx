"use client";

import { useState } from "react";
import Link from "next/link";
import type { TreeNode } from "@/lib/tree";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  ChevronIcon,
  FilePlusIcon,
  FolderPlusIcon,
} from "@/components/ui/Icons";

export function NoteTree({
  tree,
  collapsed,
  onToggleFolder,
  pathname,
  naming,
  onSubmitName,
  onCancelName,
  onMove,
}: {
  tree: TreeNode[];
  collapsed: Set<string>;
  onToggleFolder: (path: string) => void;
  pathname: string;
  naming: "note" | "folder" | null;
  onSubmitName: (name: string) => void;
  onCancelName: () => void;
  onMove: (slug: string, folder: string) => void;
}) {
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  function drop(slug: string, folder: string) {
    setDropTarget(null);
    onMove(slug, folder);
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
        const slug = event.dataTransfer.getData("application/x-note");
        if (slug) drop(slug, "");
      }}
    >
      {naming && (
        <NamingRow
          kind={naming}
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
      />
    </div>
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
  onDrop: (slug: string, folder: string) => void;
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
}: NodeListProps) {
  const nested = {
    depth: depth + 1,
    collapsed,
    onToggle,
    pathname,
    dropTarget,
    onDropTarget,
    onDrop,
  };

  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => {
        const folderIndent = { paddingLeft: `${depth * 0.75 + 0.5}rem` };
        const fileIndent = { paddingLeft: `${depth * 0.75 + 1.5}rem` };

        if (node.kind === "folder") {
          const isCollapsed = collapsed.has(node.path);

          return (
            <li key={node.path}>
              <Button
                variant="row"
                onClick={() => onToggle(node.path)}
                style={folderIndent}
                aria-expanded={!isCollapsed}
                className={dropTarget === node.path ? "bg-foreground/10" : ""}
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
                  const slug = event.dataTransfer.getData("application/x-note");
                  if (slug) onDrop(slug, node.path);
                }}
              >
                <ChevronIcon
                  className={`w-3 shrink-0 transition-transform ${
                    isCollapsed ? "" : "rotate-90"
                  }`}
                />
                {node.name}
              </Button>

              {!isCollapsed && <NodeList nodes={node.children} {...nested} />}
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
