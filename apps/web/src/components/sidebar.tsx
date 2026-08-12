"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { TreeNode } from "@/lib/tree";
import { Text } from "@/components/text";

export function Sidebar({ tree }: { tree: TreeNode[] }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const pathname = usePathname();

  function toggle(path: string) {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (!next.delete(path)) next.add(path);
      return next;
    });
  }

  return (
    <nav className="flex w-64 shrink-0 flex-col border-r border-black/10 text-sm dark:border-white/15">
      <div className="shrink-0 border-b border-black/10 p-4 dark:border-white/15">
        <Link href="/" className="block font-semibold hover:opacity-70">
          Z-Notes
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <NodeList
          nodes={tree}
          depth={0}
          collapsed={collapsed}
          onToggle={toggle}
          pathname={pathname}
        />
      </div>
    </nav>
  );
}

type NodeListProps = {
  nodes: TreeNode[];
  depth: number;
  collapsed: Set<string>;
  onToggle: (path: string) => void;
  pathname: string;
};

function NodeList({ nodes, depth, collapsed, onToggle, pathname }: NodeListProps) {
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
                className="flex w-full items-center gap-1 rounded py-1 text-left opacity-70 hover:bg-black/5 dark:hover:bg-white/10"
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
              className={`block rounded py-1 pl-4 hover:bg-black/5 dark:hover:bg-white/10 ${
                isActive ? "bg-black/5 font-medium dark:bg-white/10" : ""
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
