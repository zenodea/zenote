"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { TreeNode } from "@/lib/tree";
import { AiButton } from "@/components/ai-assistant";
import { Text } from "@/components/text";

function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  const result: TreeNode[] = [];
  for (const node of nodes) {
    if (node.kind === "folder") {
      const children = filterTree(node.children, query);
      if (children.length > 0) result.push({ ...node, children });
    } else if (node.name.toLowerCase().includes(query)) {
      result.push(node);
    }
  }
  return result;
}

const NONE_COLLAPSED: Set<string> = new Set();

export function Sidebar({ tree }: { tree: TreeNode[] }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
  }

  function toggle(path: string) {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (!next.delete(path)) next.add(path);
      return next;
    });
  }

  const trimmed = query.trim().toLowerCase();
  const searching = trimmed.length > 0;
  // In search mode the tree starts empty and fills in as matches appear.
  const shown = searchOpen
    ? searching
      ? filterTree(tree, trimmed)
      : []
    : tree;

  return (
    <nav className="flex w-64 shrink-0 flex-col border-r border-foreground/15 text-sm">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-foreground/15 px-4">
        {searchOpen ? (
          <>
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") closeSearch();
              }}
              placeholder="Search notes…"
              aria-label="Search notes"
              className="min-w-0 flex-1 rounded border border-foreground/15 bg-background px-2 py-1 placeholder:opacity-50 focus:border-foreground/40 focus:outline-none"
            />
            <button
              type="button"
              onClick={closeSearch}
              aria-label="Close search"
              className="shrink-0 opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </>
        ) : (
          <>
            <Link
              href="/"
              className="min-w-0 flex-1 truncate font-semibold hover:opacity-70"
            >
              Z-Notes
            </Link>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search notes"
              className="shrink-0 rounded p-1 opacity-60 hover:bg-foreground/10 hover:opacity-100"
            >
              <SearchIcon />
            </button>
          </>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        {searchOpen && !searching ? (
          <p className="opacity-50">Type to find files…</p>
        ) : searching && shown.length === 0 ? (
          <p className="opacity-50">No files found</p>
        ) : (
          <NodeList
            nodes={shown}
            depth={0}
            collapsed={searching ? NONE_COLLAPSED : collapsed}
            onToggle={toggle}
            pathname={pathname}
          />
        )}
      </div>
      <div className="flex shrink-0 items-center justify-between border-t border-foreground/15 p-2">
        <Link
          href="/settings"
          aria-label="Settings"
          aria-current={pathname === "/settings" ? "page" : undefined}
          className={`block rounded p-1 hover:bg-foreground/10 hover:opacity-100 ${
            pathname === "/settings" ? "opacity-100" : "opacity-60"
          }`}
        >
          <SlidersIcon />
        </Link>
        <AiButton />
      </div>
    </nav>
  );
}

function SlidersIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
      className="block"
    >
      <path d="M2 3.5h12M2 8h12M2 12.5h12" />
      <circle cx="10.5" cy="3.5" r="1.75" fill="var(--background)" />
      <circle cx="5.5" cy="8" r="1.75" fill="var(--background)" />
      <circle cx="10.5" cy="12.5" r="1.75" fill="var(--background)" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
      className="block"
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3.5 3.5" />
    </svg>
  );
}

type NodeListProps = {
  nodes: TreeNode[];
  depth: number;
  collapsed: Set<string>;
  onToggle: (path: string) => void;
  pathname: string;
};

function NodeList({
  nodes,
  depth,
  collapsed,
  onToggle,
  pathname,
}: NodeListProps) {
  return (
    <ul>
      {nodes.map((node) => {
        const indent = { paddingLeft: `${depth * 0.75}rem` };

        if (node.kind === "folder") {
          const isCollapsed = collapsed.has(node.path);

          return (
            <li key={node.path}>
              <button
                type="button"
                onClick={() => onToggle(node.path)}
                style={indent}
                className="flex w-full items-center gap-1 rounded py-1 text-left opacity-70 hover:bg-foreground/10"
                aria-expanded={!isCollapsed}
              >
                <Text className="inline-block w-3">
                  {isCollapsed ? "▸" : "▾"}
                </Text>
                {node.name}
              </button>

              {!isCollapsed && (
                <NodeList
                  nodes={node.children}
                  depth={depth + 1}
                  collapsed={collapsed}
                  onToggle={onToggle}
                  pathname={pathname}
                />
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
              style={indent}
              aria-current={isActive ? "page" : undefined}
              className={`block rounded py-1 pl-4 hover:bg-foreground/10 ${
                isActive ? "bg-foreground/10 font-medium" : ""
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
