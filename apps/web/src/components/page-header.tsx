import type { ReactNode } from "react";

/**
 * Sticky page header for the main pane. Height and bottom border match the
 * sidebar's top bar, so the two separators read as one continuous line.
 */
export function PageHeader({
  title,
  meta,
}: {
  title: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 h-14 border-b border-foreground/15 bg-background">
      <div className="mx-auto flex h-full w-full max-w-3xl items-center gap-3 px-6">
        <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight">
          {title}
        </h1>
        {meta && (
          <div className="flex min-w-0 items-center gap-2 overflow-hidden text-sm opacity-60">
            {meta}
          </div>
        )}
      </div>
    </header>
  );
}
