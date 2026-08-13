import type { ReactNode } from "react";

export function PageHeader({
  title,
  meta,
}: {
  title: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="h-14 shrink-0 border-b border-foreground/15 bg-background">
      <div className="flex h-full w-full max-w-3xl items-center gap-3 px-6">
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
