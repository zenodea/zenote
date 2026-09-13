import type { ReactNode } from "react";

export function PageHeader({
  title,
  meta,
  actions,
}: {
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header
      data-seam="bottom"
      className="app-head flex shrink-0 items-center border-b border-foreground/15 bg-background"
    >
      <div className="flex h-full w-full min-w-0 max-w-3xl items-center gap-3 px-4 md:px-6">
        <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight">
          {title}
        </h1>
        {meta && (
          <div className="flex min-w-0 items-center gap-2 overflow-hidden text-sm opacity-60">
            {meta}
          </div>
        )}
      </div>
      {actions && (
        <div className="ml-auto flex shrink-0 items-center gap-2 px-2 md:px-4">
          {actions}
        </div>
      )}
    </header>
  );
}
