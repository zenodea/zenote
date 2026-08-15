import type { ReactNode } from "react";

export function resultRowClass(active: boolean): string {
  return `block w-full rounded px-2 py-1.5 text-left hover:bg-foreground/10 ${
    active ? "bg-foreground/10" : ""
  }`;
}

export function EmptyResults({
  children = "No matches",
}: {
  children?: ReactNode;
}) {
  return <p className="px-2 py-1.5 opacity-50">{children}</p>;
}

export function TitleHighlight({
  title,
  indices,
}: {
  title: string;
  indices: number[] | null;
}) {
  if (!indices) return title;
  const marked = new Set(indices);
  return [...title].map((char, index) =>
    marked.has(index) ? (
      <span key={index} className="font-medium text-accent">
        {char}
      </span>
    ) : (
      char
    ),
  );
}
