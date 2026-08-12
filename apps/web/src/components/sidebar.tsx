"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { TreeNode } from "@/lib/tree";
import { Text } from "@/components/text";
import { ThemePicker } from "@/components/theme-picker";

const footerJustify = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
} as const;

export function Sidebar({
  tree,
  footerPosition = "right",
}: {
  tree: TreeNode[];
  footerPosition?: keyof typeof footerJustify;
}) {
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
    <nav className="flex w-64 shrink-0 flex-col border-r border-foreground/15 text-sm">
      <div className="shrink-0 border-b border-foreground/15 p-4">
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
      <div
        className={`flex shrink-0 border-t border-foreground/15 p-2 ${footerJustify[footerPosition]}`}
      >
        <ThemePicker />
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
